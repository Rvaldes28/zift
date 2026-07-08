import Link from 'next/link'
import { notFound } from 'next/navigation'

import { auditSeverityLabel, auditSourceLabel } from '@/lib/audit/constants'
import { auditActionLabel, auditHumanSummary } from '@/lib/audit/format'
import { getAuditLogEvent } from '@/lib/audit/queries'
import { requirePermission } from '@/lib/rbac/access'
import { PageHeader, StatCard } from '@/components/dashboard/ui'

interface LogDetailPageProps {
  params: Promise<{ id: string }>
}

function dateLabel(value: Date): string {
  return value.toLocaleString('es-PA', {
    dateStyle: 'full',
    timeStyle: 'medium',
  })
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{label}</h2>
      <pre className="mt-4 max-h-[420px] overflow-auto rounded-md bg-slate-950 p-4 text-xs leading-5 text-slate-50">
        {JSON.stringify(value ?? {}, null, 2)}
      </pre>
    </section>
  )
}

export default async function LogDetailPage({ params }: LogDetailPageProps) {
  await requirePermission('audit.read')
  const { id } = await params
  const event = await getAuditLogEvent(id)
  if (!event) notFound()

  return (
    <main className="px-6 py-8 lg:px-10">
      <PageHeader
        actions={
          <Link
            className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold"
            href="/dashboard/logs"
          >
            Volver a logs
          </Link>
        }
        description={auditHumanSummary(event)}
        eyebrow="Auditoria"
        title={auditActionLabel(event.action)}
      />

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Fecha" value={dateLabel(event.createdAt)} />
        <StatCard
          label="Usuario"
          value={event.actorName ?? 'Sistema'}
          helper={event.actorEmail ?? event.actorId ?? 'Sin actor'}
        />
        <StatCard
          label="Recurso"
          value={event.entityType ?? 'N/A'}
          helper={event.entityId ?? 'Sin ID'}
        />
        <StatCard
          label="Severidad"
          value={auditSeverityLabel[event.severity]}
          helper={auditSourceLabel[event.source] ?? event.source}
        />
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Contexto de request</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="font-semibold">IP</dt>
              <dd className="mt-1 text-[var(--muted)]">{event.ipAddress ?? 'N/A'}</dd>
            </div>
            <div>
              <dt className="font-semibold">Ruta</dt>
              <dd className="mt-1 text-[var(--muted)]">{event.route ?? 'N/A'}</dd>
            </div>
            <div>
              <dt className="font-semibold">Sesion</dt>
              <dd className="mt-1 break-all text-[var(--muted)]">{event.sessionId ?? 'N/A'}</dd>
            </div>
            <div>
              <dt className="font-semibold">Request ID</dt>
              <dd className="mt-1 break-all text-[var(--muted)]">{event.requestId ?? 'N/A'}</dd>
            </div>
            <div>
              <dt className="font-semibold">Navegador</dt>
              <dd className="mt-1 break-words text-[var(--muted)]">{event.userAgent ?? 'N/A'}</dd>
            </div>
          </dl>
        </article>

        <JsonBlock label="Metadata" value={event.metadata} />
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <JsonBlock label="Cambios anteriores" value={event.before} />
        <JsonBlock label="Cambios nuevos" value={event.after} />
      </section>
    </main>
  )
}
