import Link from 'next/link'

import { ModuleCard, PageHeader, StatCard } from '@/components/dashboard/ui'
import { requireAnyPermission } from '@/lib/rbac/access'
import type { PermissionSlug } from '@/lib/rbac/permissions'
import { securityStatus } from '@/lib/security/csrf'
import { getSecurityOverview } from '@/lib/security/queries'

type SecurityCard = {
  description: string
  href: string
  label: string
  permission?: PermissionSlug
}

export default async function SecurityPage() {
  const { access } = await requireAnyPermission([
    'users.read',
    'roles.read',
    'audit.read',
    'settings.read',
  ])
  const [overview, status] = await Promise.all([getSecurityOverview(), securityStatus()])

  const cards: SecurityCard[] = [
    {
      description: 'Crear, editar, activar, desactivar y asignar roles.',
      href: '/dashboard/users',
      label: 'Usuarios',
      permission: 'users.read' as const,
    },
    {
      description: 'Matriz de permisos granulares por rol.',
      href: '/dashboard/roles',
      label: 'Roles y permisos',
      permission: 'roles.read' as const,
    },
    {
      description: 'Actividad reciente, cambios sensibles y eventos de login.',
      href: '/dashboard/logs',
      label: 'Logs de auditoria',
      permission: 'audit.read' as const,
    },
    {
      description: 'Password, sesiones y 2FA de la cuenta actual.',
      href: '/dashboard/account',
      label: 'Mi seguridad',
    },
    {
      description: 'Intentos de acceso, bloqueos IP y respuesta ante abuso.',
      href: '/dashboard/security/access',
      label: 'Accesos e IPs',
      permission: 'audit.read' as const,
    },
  ]
  const visibleCards = cards.filter(
    (card) => !card.permission || access.permissions.includes(card.permission),
  )

  return (
    <main className="px-6 py-8 lg:px-10">
      <PageHeader
        eyebrow="Seguridad"
        title="Controles de acceso"
        description="Accesos operativos para usuarios, permisos, 2FA y auditoria. Las validaciones sensibles siguen ocurriendo server-side."
        actions={
          <Link
            href="/dashboard/account"
            className="inline-flex h-10 items-center rounded-md border border-[var(--line)] px-4 text-sm font-semibold transition hover:border-[var(--ink)]"
          >
            Mi cuenta
          </Link>
        }
      />

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <StatCard label="RBAC" value="Activo" helper="Permisos derivados desde DB." />
        <StatCard
          label="2FA sensible"
          value={status.enforceTwoFactorForSensitive ? 'Obligatorio' : 'Opcional'}
          helper="Admins y permisos sensibles."
        />
        <StatCard
          label="CSRF"
          value={status.csrfSecretConfigured ? 'Secreto propio' : 'Dev fallback'}
          helper={`${status.allowedOrigins.length} origenes permitidos.`}
        />
        <StatCard
          label="Sesiones"
          value={String(overview.liveSessions)}
          helper="Activas o no expiradas."
        />
        <StatCard
          label="Fallos recientes"
          value={String(overview.failedAttempts)}
          helper={`${overview.recentAttempts} intentos revisados.`}
        />
        <StatCard
          label="IPs bloqueadas"
          value={String(overview.activeIpBlocks)}
          helper="Bloqueos persistidos activos."
        />
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        {visibleCards.map((card) => (
          <ModuleCard key={card.href} {...card} status="Disponible" />
        ))}
      </section>
    </main>
  )
}
