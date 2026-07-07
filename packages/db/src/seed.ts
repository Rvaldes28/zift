import { eq } from 'drizzle-orm'

import { closeDb, db } from './client.js'
import { pageSections, pages, permissions, rolePermissions, roles, siteSettings } from './schema.js'

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
