import 'server-only'

import { envValue, envStateForIntegration, integrationHasRequiredEnv } from './env'
import { integrationFetch, normalizedError } from './http'
import { upsertIntegrationRecord, recordIntegrationLog } from './queries'
import { integrationByKey, type IntegrationStatus } from './registry'

export interface IntegrationTestResult {
  message: string
  metadata?: Record<string, unknown>
  status: IntegrationStatus
}

function paypalBaseUrl() {
  return envValue('PAYPAL_ENV') === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'
}

async function testEnvOnly(key: string): Promise<IntegrationTestResult> {
  const integration = integrationByKey(key)
  if (!integration) return { message: 'Integracion no soportada.', status: 'error' }

  const env = envStateForIntegration(integration)
  if (env.missingRequired.length > 0) {
    return {
      message: `Faltan variables requeridas: ${env.missingRequired.join(', ')}.`,
      metadata: { missingRequired: env.missingRequired },
      status: 'not_configured',
    }
  }

  if (key === 'google_tag_manager') {
    const containerId = envValue('PUBLIC_GTM_CONTAINER_ID') ?? ''
    if (!/^GTM-[A-Z0-9]+$/i.test(containerId)) {
      return {
        message: 'El container de GTM deberia tener formato GTM-XXXX.',
        status: 'error',
      }
    }
  }

  return {
    message:
      integration.authType === 'oauth_future'
        ? 'Configuracion presente. El test API requiere OAuth en una fase posterior.'
        : 'Configuracion presente.',
    status: 'configured',
  }
}

async function testMailchimp(): Promise<IntegrationTestResult> {
  const apiKey = envValue('MAILCHIMP_API_KEY')
  const prefix = envValue('MAILCHIMP_SERVER_PREFIX')
  const integration = integrationByKey('mailchimp')
  if (!apiKey || !prefix || !integration || !integrationHasRequiredEnv(integration)) {
    return {
      message: 'Mailchimp no tiene todas las variables requeridas.',
      status: 'not_configured',
    }
  }

  const response = await integrationFetch(`https://${prefix}.api.mailchimp.com/3.0/`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`ziftlab:${apiKey}`).toString('base64')}`,
    },
  })
  return {
    message: response.ok ? 'Mailchimp respondio correctamente.' : 'Mailchimp respondio con error.',
    metadata: { response },
    status: response.ok ? 'connected' : 'error',
  }
}

async function testHubspot(): Promise<IntegrationTestResult> {
  const token = envValue('HUBSPOT_ACCESS_TOKEN')
  if (!token) return { message: 'HubSpot no tiene token configurado.', status: 'not_configured' }

  const response = await integrationFetch(
    'https://api.hubapi.com/crm/objects/2026-03/contacts?limit=1',
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  )
  return {
    message: response.ok ? 'HubSpot respondio correctamente.' : 'HubSpot respondio con error.',
    metadata: { response },
    status: response.ok ? 'connected' : 'error',
  }
}

async function testStripe(): Promise<IntegrationTestResult> {
  const secretKey = envValue('STRIPE_SECRET_KEY')
  if (!secretKey)
    return { message: 'Stripe no tiene secret key configurada.', status: 'not_configured' }

  const response = await integrationFetch('https://api.stripe.com/v1/account', {
    headers: { Authorization: `Bearer ${secretKey}` },
  })
  return {
    message: response.ok ? 'Stripe respondio correctamente.' : 'Stripe respondio con error.',
    metadata: { response },
    status: response.ok ? 'connected' : 'error',
  }
}

async function testPaypal(): Promise<IntegrationTestResult> {
  const clientId = envValue('PAYPAL_CLIENT_ID')
  const clientSecret = envValue('PAYPAL_CLIENT_SECRET')
  if (!clientId || !clientSecret) {
    return { message: 'PayPal no tiene client id/secret configurados.', status: 'not_configured' }
  }

  const response = await integrationFetch(
    `${paypalBaseUrl()}/v1/oauth2/token`,
    {
      body: 'grant_type=client_credentials',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      method: 'POST',
    },
    12000,
  )
  return {
    message: response.ok ? 'PayPal emitio access token.' : 'PayPal respondio con error.',
    metadata: { response: { ...response, body: response.ok ? '[redacted]' : response.body } },
    status: response.ok ? 'connected' : 'error',
  }
}

async function testWebhook(key: string): Promise<IntegrationTestResult> {
  const integration = integrationByKey(key)
  if (!integration) return { message: 'Integracion no soportada.', status: 'error' }
  const env = envStateForIntegration(integration)
  if (env.missingRequired.length > 0) {
    return {
      message: `Faltan variables requeridas: ${env.missingRequired.join(', ')}.`,
      metadata: { missingRequired: env.missingRequired },
      status: 'not_configured',
    }
  }
  return {
    message: 'Configuracion lista. Usa "Enviar lead de prueba" para validar el destino.',
    status: 'configured',
  }
}

export async function runIntegrationTest(input: {
  actorId: string
  key: string
}): Promise<IntegrationTestResult> {
  const integration = integrationByKey(input.key)
  if (!integration) return { message: 'Integracion no soportada.', status: 'error' }

  let result: IntegrationTestResult
  try {
    if (integration.testStrategy === 'http_mailchimp') result = await testMailchimp()
    else if (integration.testStrategy === 'http_hubspot') result = await testHubspot()
    else if (integration.testStrategy === 'http_stripe_account') result = await testStripe()
    else if (integration.testStrategy === 'http_paypal_oauth') result = await testPaypal()
    else if (integration.testStrategy === 'http_custom_webhook')
      result = await testWebhook(input.key)
    else if (integration.testStrategy === 'webhook_only') result = await testWebhook(input.key)
    else result = await testEnvOnly(input.key)
  } catch (error) {
    result = {
      message: normalizedError(error),
      status: 'error',
    }
  }

  await upsertIntegrationRecord({
    enabled: result.status === 'connected' || result.status === 'configured',
    environment:
      envValue('PAYPAL_ENV') === 'live'
        ? 'live'
        : input.key === 'paypal' || input.key === 'stripe'
          ? 'sandbox'
          : 'live',
    key: input.key,
    lastCheckedAt: new Date(),
    lastError: result.status === 'error' ? result.message : null,
    metadata: result.metadata ?? {},
    status: result.status,
    updatedBy: input.actorId,
  })

  await recordIntegrationLog({
    action: 'integration.test',
    createdBy: input.actorId,
    integrationKey: input.key,
    level: result.status === 'error' ? 'error' : 'info',
    message: result.message,
    metadata: result.metadata ?? {},
    status: result.status === 'error' ? 'failed' : 'ok',
  })

  return result
}
