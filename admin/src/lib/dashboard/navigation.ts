import type { PermissionSlug } from '@/lib/rbac/permissions'

export type DashboardNavGroup = {
  label: string
  items: DashboardNavItem[]
}

export type DashboardNavItem = {
  id: string
  label: string
  href: string
  description: string
  permissions?: PermissionSlug[]
  access?: 'any' | 'all'
}

export type DashboardBreadcrumb = {
  label: string
  href?: string
}

export const dashboardNavGroups: DashboardNavGroup[] = [
  {
    label: 'Principal',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        href: '/dashboard',
        description: 'Resumen operativo del admin propio.',
        permissions: ['dashboard.access'],
      },
      {
        id: 'pages',
        label: 'Paginas',
        href: '/dashboard/pages',
        description: 'Home, paginas institucionales, landings y secciones.',
        permissions: ['content.read'],
      },
      {
        id: 'media',
        label: 'Media',
        href: '/dashboard/media',
        description: 'Imagenes, documentos, metadata y storage propio.',
        permissions: ['media.read'],
      },
      {
        id: 'services',
        label: 'Servicios',
        href: '/dashboard/services',
        description: 'Catalogo publico de servicios y metadata asociada.',
        permissions: ['content.read'],
      },
      {
        id: 'blog',
        label: 'Blog',
        href: '/dashboard/blog',
        description: 'Posts, categorias, autores y publicacion editorial.',
        permissions: ['content.read'],
      },
      {
        id: 'leads',
        label: 'Leads',
        href: '/dashboard/leads',
        description: 'Bandeja comercial y formularios publicos.',
        permissions: ['leads.read'],
      },
    ],
  },
  {
    label: 'Administracion',
    items: [
      {
        id: 'users',
        label: 'Usuarios',
        href: '/dashboard/users',
        description: 'Cuentas, estados, roles y 2FA.',
        permissions: ['users.read'],
      },
      {
        id: 'seo',
        label: 'SEO',
        href: '/dashboard/seo',
        description: 'Metadata, redirects y salud de indexacion.',
        permissions: ['seo.read'],
      },
      {
        id: 'analytics',
        label: 'Analytics',
        href: '/dashboard/analytics',
        description: 'Lectura futura de trafico y conversion.',
        permissions: ['analytics.read'],
      },
      {
        id: 'performance',
        label: 'Performance',
        href: '/dashboard/performance',
        description: 'Web vitals, checks y monitoreo tecnico.',
        permissions: ['performance.read'],
      },
    ],
  },
  {
    label: 'Sistema',
    items: [
      {
        id: 'integrations',
        label: 'Integraciones',
        href: '/dashboard/integrations',
        description: 'Servicios externos, llaves y estado de conexiones.',
        permissions: ['settings.read'],
      },
      {
        id: 'backups',
        label: 'Backups',
        href: '/dashboard/backups',
        description: 'Respaldos de DB, media y restauraciones futuras.',
        permissions: ['settings.read'],
      },
      {
        id: 'security',
        label: 'Seguridad',
        href: '/dashboard/security',
        description: 'Accesos, roles, sesiones y controles de auditoria.',
        permissions: ['users.read', 'roles.read', 'audit.read', 'settings.read'],
        access: 'any',
      },
      {
        id: 'logs',
        label: 'Logs',
        href: '/dashboard/logs',
        description: 'Actividad administrativa y eventos auditables.',
        permissions: ['audit.read'],
      },
      {
        id: 'settings',
        label: 'Configuracion',
        href: '/dashboard/settings',
        description: 'Ajustes globales del dashboard y sitio publico.',
        permissions: ['settings.read'],
      },
    ],
  },
]

const utilityBreadcrumbs: Record<string, DashboardBreadcrumb[]> = {
  '/dashboard/account': [{ label: 'Dashboard', href: '/dashboard' }, { label: 'Cuenta' }],
  '/dashboard/roles': [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Seguridad', href: '/dashboard/security' },
    { label: 'Roles' },
  ],
  '/dashboard/security/access': [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Seguridad', href: '/dashboard/security' },
    { label: 'Accesos e IPs' },
  ],
  '/dashboard/activity': [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Logs', href: '/dashboard/logs' },
    { label: 'Actividad' },
  ],
}

export function getAllDashboardNavItems() {
  return dashboardNavGroups.flatMap((group) => group.items)
}

export function canAccessDashboardNavItem(
  item: DashboardNavItem,
  permissions: readonly PermissionSlug[],
) {
  if (!item.permissions || item.permissions.length === 0) return true

  if (item.access === 'all') {
    return item.permissions.every((permission) => permissions.includes(permission))
  }

  return item.permissions.some((permission) => permissions.includes(permission))
}

export function getVisibleDashboardNavGroups(
  permissions: readonly PermissionSlug[],
): DashboardNavGroup[] {
  return dashboardNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessDashboardNavItem(item, permissions)),
    }))
    .filter((group) => group.items.length > 0)
}

export function getDashboardBreadcrumbs(pathname: string): DashboardBreadcrumb[] {
  if (utilityBreadcrumbs[pathname]) return utilityBreadcrumbs[pathname]

  if (pathname === '/dashboard/users/new') {
    return [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Usuarios', href: '/dashboard/users' },
      { label: 'Crear usuario' },
    ]
  }

  if (pathname.startsWith('/dashboard/users/')) {
    return [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Usuarios', href: '/dashboard/users' },
      { label: 'Detalle' },
    ]
  }

  if (pathname === '/dashboard/media/new') {
    return [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Media', href: '/dashboard/media' },
      { label: 'Subir archivo' },
    ]
  }

  if (pathname.startsWith('/dashboard/media/')) {
    return [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Media', href: '/dashboard/media' },
      { label: 'Detalle' },
    ]
  }

  const navItem = getAllDashboardNavItems().find((item) => item.href === pathname)
  if (!navItem || pathname === '/dashboard') {
    return [{ label: 'Dashboard' }]
  }

  return [{ label: 'Dashboard', href: '/dashboard' }, { label: navItem.label }]
}

export function isDashboardNavItemActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === href

  return pathname === href || pathname.startsWith(`${href}/`)
}
