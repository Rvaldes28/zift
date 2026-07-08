import 'server-only'

export type IntegrationCategory =
  | 'ads'
  | 'analytics'
  | 'automation'
  | 'crm'
  | 'external'
  | 'marketing'
  | 'messaging'
  | 'payments'
  | 'seo'

export type IntegrationStatus = 'configured' | 'connected' | 'error' | 'not_configured'
export type IntegrationEnvironment = 'live' | 'sandbox'

export interface IntegrationEnvVar {
  label: string
  name: string
  public?: boolean
  required?: boolean
  secret?: boolean
}

export interface IntegrationRegistryItem {
  authType: 'api_key' | 'bearer' | 'basic_oauth' | 'env_only' | 'hmac' | 'oauth_future' | 'webhook'
  capabilities: string[]
  category: IntegrationCategory
  docsUrl: string
  envVars: IntegrationEnvVar[]
  key: string
  name: string
  notes: string
  provider: string
  testStrategy:
    | 'env_only'
    | 'http_custom_webhook'
    | 'http_hubspot'
    | 'http_mailchimp'
    | 'http_paypal_oauth'
    | 'http_stripe_account'
    | 'webhook_only'
}

export const integrationRegistry = [
  {
    authType: 'oauth_future',
    capabilities: ['Reporting API futuro', 'Estado de propiedad', 'Dashboard marketing'],
    category: 'analytics',
    docsUrl: 'https://developers.google.com/analytics/devguides/reporting/data/v1',
    envVars: [
      { label: 'Measurement ID publico', name: 'PUBLIC_GA4_ID', public: true, required: true },
      { label: 'Property ID', name: 'GOOGLE_ANALYTICS_PROPERTY_ID', required: true },
    ],
    key: 'google_analytics',
    name: 'Google Analytics 4',
    notes: 'FASE 17 valida configuracion. Reporting API profundo queda para OAuth posterior.',
    provider: 'google',
    testStrategy: 'env_only',
  },
  {
    authType: 'oauth_future',
    capabilities: ['Consultas SEO futuras', 'Performance organica', 'Errores de indexacion'],
    category: 'seo',
    docsUrl: 'https://developers.google.com/webmaster-tools/v1/how-tos/search_analytics',
    envVars: [{ label: 'Site URL', name: 'GOOGLE_SEARCH_CONSOLE_SITE_URL', required: true }],
    key: 'google_search_console',
    name: 'Google Search Console',
    notes: 'La API requiere autorizacion Google; esta fase deja la propiedad y estado listos.',
    provider: 'google',
    testStrategy: 'env_only',
  },
  {
    authType: 'oauth_future',
    capabilities: ['Carga consent-gated', 'Container publico', 'Gestion API futura'],
    category: 'marketing',
    docsUrl: 'https://developers.google.com/tag-platform/tag-manager/api/v2',
    envVars: [
      { label: 'Container ID', name: 'PUBLIC_GTM_CONTAINER_ID', public: true, required: true },
    ],
    key: 'google_tag_manager',
    name: 'Google Tag Manager',
    notes:
      'El container se carga desde Astro con consentimiento. Gestion de tags requiere OAuth futuro.',
    provider: 'google',
    testStrategy: 'env_only',
  },
  {
    authType: 'oauth_future',
    capabilities: ['Conversion tags', 'Ads API futura', 'Estado de cuenta'],
    category: 'ads',
    docsUrl: 'https://developers.google.com/google-ads/api/docs/get-started/introduction',
    envVars: [
      { label: 'Conversion/Ads ID publico', name: 'PUBLIC_GOOGLE_ADS_ID', public: true },
      { label: 'Customer ID', name: 'GOOGLE_ADS_CUSTOMER_ID', required: true },
      {
        label: 'Developer token',
        name: 'GOOGLE_ADS_DEVELOPER_TOKEN',
        required: true,
        secret: true,
      },
      { label: 'Login customer ID', name: 'GOOGLE_ADS_LOGIN_CUSTOMER_ID' },
    ],
    key: 'google_ads',
    name: 'Google Ads',
    notes: 'Google Ads requiere autorizacion documentada; FASE 17 no obtiene tokens OAuth.',
    provider: 'google',
    testStrategy: 'env_only',
  },
  {
    authType: 'env_only',
    capabilities: ['Pixel consent-gated', 'PageView', 'Eventos marketing futuros'],
    category: 'marketing',
    docsUrl: 'https://developers.facebook.com/docs/meta-pixel/implementation',
    envVars: [
      { label: 'Pixel ID publico', name: 'PUBLIC_META_PIXEL_ID', public: true, required: true },
    ],
    key: 'meta_pixel',
    name: 'Meta Pixel',
    notes: 'Solo se carga despues de consentimiento marketing.',
    provider: 'meta',
    testStrategy: 'env_only',
  },
  {
    authType: 'webhook',
    capabilities: ['Webhook verificado', 'Eventos entrantes', 'Conversaciones futuras'],
    category: 'messaging',
    docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks',
    envVars: [
      { label: 'Phone number ID', name: 'WHATSAPP_BUSINESS_PHONE_NUMBER_ID', required: true },
      {
        label: 'Access token',
        name: 'WHATSAPP_BUSINESS_ACCESS_TOKEN',
        required: true,
        secret: true,
      },
      {
        label: 'Verify token',
        name: 'WHATSAPP_BUSINESS_VERIFY_TOKEN',
        required: true,
        secret: true,
      },
      { label: 'App secret', name: 'WHATSAPP_BUSINESS_APP_SECRET', required: true, secret: true },
    ],
    key: 'whatsapp_business',
    name: 'WhatsApp Business',
    notes: 'FASE 17 registra webhooks verificados. No envia conversaciones automaticas.',
    provider: 'meta',
    testStrategy: 'webhook_only',
  },
  {
    authType: 'api_key',
    capabilities: ['Ping API', 'Alta/actualizacion de contacto', 'Audiences'],
    category: 'marketing',
    docsUrl: 'https://mailchimp.com/developer/marketing/api/',
    envVars: [
      { label: 'API key', name: 'MAILCHIMP_API_KEY', required: true, secret: true },
      { label: 'Server prefix', name: 'MAILCHIMP_SERVER_PREFIX', required: true },
      { label: 'Audience ID', name: 'MAILCHIMP_AUDIENCE_ID', required: true },
    ],
    key: 'mailchimp',
    name: 'Mailchimp',
    notes: 'El test usa API root. Contact sync se ejecuta solo con integracion activa.',
    provider: 'mailchimp',
    testStrategy: 'http_mailchimp',
  },
  {
    authType: 'bearer',
    capabilities: ['Ping contactos', 'Alta/actualizacion de contacto', 'CRM'],
    category: 'crm',
    docsUrl: 'https://developers.hubspot.com/docs/api-reference/latest/overview',
    envVars: [
      { label: 'Private app token', name: 'HUBSPOT_ACCESS_TOKEN', required: true, secret: true },
      { label: 'Portal ID', name: 'HUBSPOT_PORTAL_ID' },
    ],
    key: 'hubspot',
    name: 'HubSpot',
    notes: 'Usa la API versionada 2026-03 para test liviano de contactos.',
    provider: 'hubspot',
    testStrategy: 'http_hubspot',
  },
  {
    authType: 'api_key',
    capabilities: ['Test de cuenta', 'Webhook verificado', 'Pagos futuros'],
    category: 'payments',
    docsUrl: 'https://docs.stripe.com/api',
    envVars: [
      { label: 'Secret key', name: 'STRIPE_SECRET_KEY', required: true, secret: true },
      { label: 'Publishable key', name: 'PUBLIC_STRIPE_PUBLISHABLE_KEY', public: true },
      { label: 'Webhook secret', name: 'STRIPE_WEBHOOK_SECRET', required: true, secret: true },
    ],
    key: 'stripe',
    name: 'Stripe',
    notes: 'No crea cobros. Solo estado de cuenta y webhooks.',
    provider: 'stripe',
    testStrategy: 'http_stripe_account',
  },
  {
    authType: 'basic_oauth',
    capabilities: ['OAuth client credentials', 'Webhook verificado', 'Pagos futuros'],
    category: 'payments',
    docsUrl: 'https://developer.paypal.com/api/rest/',
    envVars: [
      { label: 'Client ID', name: 'PAYPAL_CLIENT_ID', required: true },
      { label: 'Client secret', name: 'PAYPAL_CLIENT_SECRET', required: true, secret: true },
      { label: 'Environment', name: 'PAYPAL_ENV', required: true },
      { label: 'Webhook ID', name: 'PAYPAL_WEBHOOK_ID', required: true },
    ],
    key: 'paypal',
    name: 'PayPal',
    notes: 'El test obtiene access token por client credentials. No crea ordenes ni cobros.',
    provider: 'paypal',
    testStrategy: 'http_paypal_oauth',
  },
  {
    authType: 'webhook',
    capabilities: ['Enviar lead', 'Firma HMAC opcional', 'Automatizacion'],
    category: 'automation',
    docsUrl: 'https://docs.zapier.com/integrations/build/action',
    envVars: [
      { label: 'Webhook URL', name: 'ZAPIER_WEBHOOK_URL', required: true },
      { label: 'Webhook secret', name: 'ZAPIER_WEBHOOK_SECRET', secret: true },
    ],
    key: 'zapier',
    name: 'Zapier',
    notes: 'Envia payloads normalizados; Zapier debe manejar errores 4xx/5xx.',
    provider: 'zapier',
    testStrategy: 'http_custom_webhook',
  },
  {
    authType: 'webhook',
    capabilities: ['Enviar lead', 'Webhook scenario', 'Automatizacion'],
    category: 'automation',
    docsUrl: 'https://developers.make.com/',
    envVars: [
      { label: 'Webhook URL', name: 'MAKE_WEBHOOK_URL', required: true },
      { label: 'API token', name: 'MAKE_API_TOKEN', secret: true },
    ],
    key: 'make',
    name: 'Make',
    notes: 'FASE 17 envia a webhook. Make API queda preparada por token.',
    provider: 'make',
    testStrategy: 'http_custom_webhook',
  },
  {
    authType: 'webhook',
    capabilities: ['Enviar lead', 'Firma HMAC opcional', 'CRM externo'],
    category: 'crm',
    docsUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP',
    envVars: [
      { label: 'Webhook URL', name: 'CUSTOM_CRM_WEBHOOK_URL', required: true },
      { label: 'Webhook secret', name: 'CUSTOM_CRM_WEBHOOK_SECRET', secret: true },
    ],
    key: 'custom_crm',
    name: 'CRM personalizado',
    notes: 'Sustituye gradualmente el LEADS_CRM_WEBHOOK_URL historico.',
    provider: 'custom',
    testStrategy: 'http_custom_webhook',
  },
  {
    authType: 'env_only',
    capabilities: ['Inventario', 'Docs', 'Estado manual'],
    category: 'external',
    docsUrl: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API',
    envVars: [],
    key: 'external_api',
    name: 'APIs externas',
    notes: 'Espacio para registrar integraciones futuras sin guardar secretos en DB.',
    provider: 'custom',
    testStrategy: 'env_only',
  },
] as const satisfies readonly IntegrationRegistryItem[]

export type IntegrationKey = (typeof integrationRegistry)[number]['key']

export function integrationByKey(key: string): IntegrationRegistryItem | null {
  return integrationRegistry.find((integration) => integration.key === key) ?? null
}

export function integrationCategories() {
  return [...new Set(integrationRegistry.map((integration) => integration.category))]
}
