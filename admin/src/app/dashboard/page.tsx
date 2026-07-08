import { getAllDashboardNavItems, getVisibleDashboardNavGroups } from '@/lib/dashboard/navigation'
import { requirePermission } from '@/lib/rbac/access'
import { ModuleCard, PageHeader, StatCard } from '@/components/dashboard/ui'

export default async function DashboardPage() {
  const { access } = await requirePermission('dashboard.access')
  const visibleGroups = getVisibleDashboardNavGroups(access.permissions)
  const visibleModules = visibleGroups.flatMap((group) => group.items)
  const allModules = getAllDashboardNavItems()

  return (
    <main className="px-6 py-8 lg:px-10">
      <PageHeader
        eyebrow="Dashboard"
        title="Panel administrativo propio"
        description="Shell navegable para operar contenido, leads, seguridad y salud tecnica desde la plataforma propia."
      />

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        <StatCard label="Framework" value="Next.js App Router" helper="Admin independiente." />
        <StatCard
          label="CMS externo"
          value="No requerido"
          helper="La web publica consume la API propia."
        />
        <StatCard
          label="Modulos visibles"
          value={`${visibleModules.length}/${allModules.length}`}
          helper="Filtrados por permisos RBAC."
        />
      </section>

      <section className="mt-10 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {visibleModules.map((module) => (
          <ModuleCard
            key={module.href}
            href={module.href}
            label={module.label}
            description={module.description}
          />
        ))}
      </section>
    </main>
  )
}
