import { EmptyState } from './ui'

type ActivityEntry = {
  action: string
  actorEmail: string | null
  actorName: string | null
  createdAt: Date
  entityId: string | null
  entityType: string | null
  id: string
}

export function ActivityLogList({ activity }: { activity: ActivityEntry[] }) {
  if (activity.length === 0) {
    return (
      <EmptyState
        title="Sin actividad registrada"
        message="Los eventos de seguridad y administracion apareceran aqui cuando el dashboard tenga uso real."
      />
    )
  }

  return (
    <section className="overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-sm">
      {activity.map((entry) => (
        <article
          key={entry.id}
          className="grid gap-2 border-b border-[var(--line)] px-4 py-4 text-sm last:border-b-0 lg:grid-cols-[1fr_180px]"
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
    </section>
  )
}
