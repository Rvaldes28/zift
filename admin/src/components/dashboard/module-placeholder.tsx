import { EmptyState, ModuleCard, PageHeader, StatCard } from './ui'

export function ModulePlaceholder({
  capabilities,
  description,
  emptyMessage,
  emptyTitle = 'Sin datos conectados todavia',
  eyebrow,
  stats,
  title,
}: {
  capabilities: Array<{
    description: string
    label: string
    status?: string
  }>
  description: string
  emptyMessage: string
  emptyTitle?: string
  eyebrow: string
  stats?: Array<{
    helper?: string
    label: string
    value: string
  }>
  title: string
}) {
  return (
    <main className="px-6 py-8 lg:px-10">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />

      {stats && stats.length > 0 && (
        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </section>
      )}

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        {capabilities.map((capability) => (
          <ModuleCard key={capability.label} {...capability} />
        ))}
      </section>

      <div className="mt-8">
        <EmptyState title={emptyTitle} message={emptyMessage} />
      </div>
    </main>
  )
}
