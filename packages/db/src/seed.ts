import { eq } from 'drizzle-orm'

import { closeDb, db } from './client.js'
import {
  integrations,
  notificationRules,
  pageSections,
  pages,
  permissions,
  rolePermissions,
  roles,
  siteSettings,
} from './schema.js'

const roleSeeds = [
  {
    slug: 'admin',
    name: 'Admin',
    description: 'Acceso total al dashboard propio.',
  },
  {
    slug: 'editor',
    name: 'Editor',
    description: 'Gestiona contenido editorial y media.',
  },
  {
    slug: 'marketing',
    name: 'Marketing',
    description: 'Gestiona SEO, campanas, analitica y leads.',
  },
  {
    slug: 'support',
    name: 'Soporte',
    description: 'Consulta leads y seguimiento operativo.',
  },
]

const permissionSeeds = [
  { slug: 'dashboard.access', description: 'Entrar al dashboard.' },
  { slug: 'users.read', description: 'Leer usuarios y roles asignados.' },
  { slug: 'users.manage', description: 'Crear, editar y desactivar usuarios.' },
  { slug: 'roles.read', description: 'Leer roles y permisos.' },
  { slug: 'roles.manage', description: 'Editar permisos asignados a roles.' },
  { slug: 'content.read', description: 'Leer contenido editorial.' },
  { slug: 'content.manage', description: 'Crear y editar contenido.' },
  { slug: 'media.read', description: 'Leer archivos y metadatos.' },
  { slug: 'media.manage', description: 'Gestionar archivos y metadatos.' },
  { slug: 'seo.read', description: 'Leer metadata SEO y redirecciones.' },
  { slug: 'seo.manage', description: 'Gestionar metadata SEO y redirecciones.' },
  { slug: 'leads.read', description: 'Leer leads y notas internas.' },
  { slug: 'leads.manage', description: 'Gestionar leads y notas internas.' },
  { slug: 'analytics.read', description: 'Leer analitica y conversiones.' },
  { slug: 'performance.read', description: 'Leer checks de performance.' },
  { slug: 'settings.read', description: 'Leer configuracion general.' },
  { slug: 'settings.manage', description: 'Gestionar configuracion general.' },
  { slug: 'audit.read', description: 'Leer auditoria y actividad.' },
]

const rolePermissionSeeds: Record<string, string[]> = {
  admin: permissionSeeds.map((permission) => permission.slug),
  editor: [
    'dashboard.access',
    'content.read',
    'content.manage',
    'media.read',
    'media.manage',
    'seo.read',
    'seo.manage',
  ],
  marketing: [
    'dashboard.access',
    'content.read',
    'seo.read',
    'seo.manage',
    'leads.read',
    'leads.manage',
    'analytics.read',
  ],
  support: ['dashboard.access', 'leads.read'],
}

const integrationSeeds = [
  {
    category: 'analytics',
    docsUrl: 'https://developers.google.com/analytics/devguides/reporting/data/v1',
    key: 'google_analytics',
    name: 'Google Analytics 4',
    provider: 'google',
  },
  {
    category: 'seo',
    docsUrl: 'https://developers.google.com/webmaster-tools/v1/how-tos/search_analytics',
    key: 'google_search_console',
    name: 'Google Search Console',
    provider: 'google',
  },
  {
    category: 'marketing',
    docsUrl: 'https://developers.google.com/tag-platform/tag-manager/api/v2',
    key: 'google_tag_manager',
    name: 'Google Tag Manager',
    provider: 'google',
  },
  {
    category: 'ads',
    docsUrl: 'https://developers.google.com/google-ads/api/docs/get-started/introduction',
    key: 'google_ads',
    name: 'Google Ads',
    provider: 'google',
  },
  {
    category: 'marketing',
    docsUrl: 'https://developers.facebook.com/docs/meta-pixel/implementation',
    key: 'meta_pixel',
    name: 'Meta Pixel',
    provider: 'meta',
  },
  {
    category: 'messaging',
    docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks',
    key: 'whatsapp_business',
    name: 'WhatsApp Business',
    provider: 'meta',
  },
  {
    category: 'marketing',
    docsUrl: 'https://mailchimp.com/developer/marketing/api/',
    key: 'mailchimp',
    name: 'Mailchimp',
    provider: 'mailchimp',
  },
  {
    category: 'crm',
    docsUrl: 'https://developers.hubspot.com/docs/api-reference/latest/overview',
    key: 'hubspot',
    name: 'HubSpot',
    provider: 'hubspot',
  },
  {
    category: 'payments',
    docsUrl: 'https://docs.stripe.com/api',
    key: 'stripe',
    name: 'Stripe',
    provider: 'stripe',
  },
  {
    category: 'payments',
    docsUrl: 'https://developer.paypal.com/api/rest/',
    key: 'paypal',
    name: 'PayPal',
    provider: 'paypal',
  },
  {
    category: 'automation',
    docsUrl: 'https://docs.zapier.com/integrations/build/action',
    key: 'zapier',
    name: 'Zapier',
    provider: 'zapier',
  },
  {
    category: 'automation',
    docsUrl: 'https://developers.make.com/',
    key: 'make',
    name: 'Make',
    provider: 'make',
  },
  {
    category: 'crm',
    docsUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP',
    key: 'custom_crm',
    name: 'CRM personalizado',
    provider: 'custom',
  },
  {
    category: 'external',
    docsUrl: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API',
    key: 'external_api',
    name: 'APIs externas',
    provider: 'custom',
  },
]

const notificationRuleSeeds = [
  {
    channels: ['dashboard', 'email'],
    eventType: 'lead.created',
    label: 'Nuevo lead recibido',
    severity: 'info',
  },
  {
    channels: ['dashboard', 'email', 'slack', 'telegram'],
    eventType: 'order.created',
    label: 'Nuevo pedido',
    severity: 'warning',
  },
  {
    channels: ['dashboard', 'email', 'slack', 'telegram'],
    eventType: 'payment.received',
    label: 'Pago recibido',
    severity: 'info',
  },
  {
    channels: ['dashboard', 'email', 'slack', 'telegram'],
    eventType: 'system.error',
    label: 'Error del sistema',
    severity: 'critical',
  },
  {
    channels: ['dashboard', 'email', 'slack', 'telegram'],
    eventType: 'site.down',
    label: 'Pagina caida',
    severity: 'critical',
  },
  {
    channels: ['dashboard', 'email', 'slack'],
    eventType: 'backup.failed',
    label: 'Backup fallido',
    severity: 'critical',
  },
  {
    channels: ['dashboard', 'email', 'slack', 'telegram'],
    eventType: 'security.suspicious_login',
    label: 'Intento sospechoso de login',
    severity: 'critical',
  },
  {
    channels: ['dashboard', 'email', 'slack'],
    eventType: 'form.error',
    label: 'Formulario con error',
    severity: 'critical',
  },
  {
    channels: ['dashboard', 'email'],
    eventType: 'performance.slow',
    label: 'Baja velocidad del sitio',
    severity: 'warning',
  },
]

async function seedRoles() {
  for (const role of roleSeeds) {
    await db
      .insert(roles)
      .values({ ...role, system: true })
      .onConflictDoUpdate({
        target: roles.slug,
        set: {
          name: role.name,
          description: role.description,
          system: true,
          updatedAt: new Date(),
        },
      })
  }
}

async function seedPermissions() {
  for (const permission of permissionSeeds) {
    await db
      .insert(permissions)
      .values(permission)
      .onConflictDoUpdate({
        target: permissions.slug,
        set: {
          description: permission.description,
          updatedAt: new Date(),
        },
      })
  }
}

async function seedRolePermissions() {
  const existingRoles = await db.select({ id: roles.id, slug: roles.slug }).from(roles)
  const existingPermissions = await db
    .select({ id: permissions.id, slug: permissions.slug })
    .from(permissions)

  const roleIds = new Map(existingRoles.map((role) => [role.slug, role.id]))
  const permissionIds = new Map(
    existingPermissions.map((permission) => [permission.slug, permission.id]),
  )

  for (const [roleSlug, permissionSlugs] of Object.entries(rolePermissionSeeds)) {
    const roleId = roleIds.get(roleSlug)
    if (!roleId) continue

    for (const permissionSlug of permissionSlugs) {
      const permissionId = permissionIds.get(permissionSlug)
      if (!permissionId) continue

      await db.insert(rolePermissions).values({ roleId, permissionId }).onConflictDoNothing()
    }
  }
}

async function seedSiteSettings() {
  const existing = await db.query.siteSettings.findFirst({
    where: eq(siteSettings.key, 'site'),
  })

  if (existing) return

  await db.insert(siteSettings).values({
    key: 'site',
    value: {
      siteName: 'ZiftLab',
      tagline: 'Tecnologia que vende',
      phase: 2,
    },
  })
}

async function seedIntegrations() {
  for (const integration of integrationSeeds) {
    await db
      .insert(integrations)
      .values({
        ...integration,
        config: {},
        enabled: false,
        environment:
          integration.key === 'paypal' || integration.key === 'stripe' ? 'sandbox' : 'live',
        metadata: {},
        status: 'not_configured',
      })
      .onConflictDoUpdate({
        target: integrations.key,
        set: {
          category: integration.category,
          docsUrl: integration.docsUrl,
          name: integration.name,
          provider: integration.provider,
          updatedAt: new Date(),
        },
      })
  }
}

async function seedNotificationRules() {
  for (const rule of notificationRuleSeeds) {
    await db
      .insert(notificationRules)
      .values({
        ...rule,
        dedupeMinutes: 15,
        enabled: true,
        metadata: {},
      })
      .onConflictDoUpdate({
        target: notificationRules.eventType,
        set: {
          channels: rule.channels,
          label: rule.label,
          severity: rule.severity,
          updatedAt: new Date(),
        },
      })
  }
}

async function seedPages() {
  const pageSeeds = [
    {
      excerpt: 'Administra la home publica desde el dashboard propio.',
      routePath: '/',
      slug: 'home',
      title: 'Home',
      type: 'home',
    },
    {
      excerpt: 'Pagina institucional de ZiftLab.',
      routePath: '/quienes-somos',
      slug: 'quienes-somos',
      title: 'Quienes somos',
      type: 'about',
    },
    {
      excerpt: 'Formulario y datos de contacto.',
      routePath: '/contacto',
      slug: 'contacto',
      title: 'Contacto',
      type: 'contact',
    },
  ]

  for (const page of pageSeeds) {
    await db.insert(pages).values(page).onConflictDoNothing({ target: pages.slug })
  }

  const createdPages = await db
    .select({ id: pages.id, slug: pages.slug, type: pages.type })
    .from(pages)

  for (const page of createdPages.filter((item) =>
    pageSeeds.some((seedPage) => seedPage.slug === item.slug),
  )) {
    const existingSection = await db.query.pageSections.findFirst({
      where: (section, { eq }) => eq(section.pageId, page.id),
    })
    if (existingSection) continue

    await db.insert(pageSections).values({
      data:
        page.type === 'home'
          ? {
              eyebrow: 'Dashboard propio',
              primaryCta: { href: '/contacto', label: 'Hablemos' },
              secondaryCta: { href: '/servicios', label: 'Ver servicios' },
              subtitle: 'Esta home puede administrarse desde el dashboard propio.',
              title: 'ZiftLab',
            }
          : {
              text: 'Edita este contenido desde el dashboard propio.',
              title: page.type === 'contact' ? 'Contacto' : 'Quienes somos',
            },
      kind: page.type === 'home' ? 'hero' : 'text',
      label: page.type === 'home' ? 'Hero' : 'Intro',
      pageId: page.id,
      position: 0,
    })
  }
}

async function seed() {
  await seedRoles()
  await seedPermissions()
  await seedRolePermissions()
  await seedSiteSettings()
  await seedIntegrations()
  await seedNotificationRules()
  await seedPages()
}

try {
  await seed()
  console.info('Seed de @ziftlab/db completado')
} catch (error) {
  console.error('Seed de @ziftlab/db fallo:', error)
  process.exitCode = 1
} finally {
  await closeDb()
}
