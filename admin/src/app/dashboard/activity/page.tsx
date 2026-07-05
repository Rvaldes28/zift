import { requirePermission } from '@/lib/rbac/access'
import { listActivity } from '@/lib/users/queries'

export default async function ActivityPage() {
  await requirePermission('audit.read')
  const activity = await listActivity(120)

  return (
    <main className="px-6 py-8 lg:px-10">
      <section>
        <p className="font-mono text-xs tracking-[0.18em] text-[var(--muted)] uppercase">
          Auditoria
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Actividad</h1>
      </section>

      <section className="mt-8 overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-sm">
        {activity.map((entry) => (
          <article
            key={entry.id}
            className="grid gap-2 border-b border-[var(--line)] px-4 py-4 text-sm lg:grid-cols-[1fr_180px]"
          >
            <div>
              <p className="font-semibold">{entry.action}</p>
              <p className="text-[var(--muted)]">
                {entry.actorName ?? 'Sistema'} {entry.actorEmail ? `(${entry.actorEmail})` : ''}
              </p>
              {entry.entityType && (
                <p className="mt-1 font-mono text-xs text-[var(--muted)]">
                  {entry.entityType}:{entry.entityId}
                </p>
              )}
            </div>
            <time className="text-[var(--muted)]">{entry.createdAt.toLocaleString('es-PA')}</time>
          </article>
        ))}
        {activity.length === 0 && (
          <p className="px-4 py-8 text-sm text-[var(--muted)]">Sin actividad registrada.</p>
        )}
      </section>
    </main>
  )
}
