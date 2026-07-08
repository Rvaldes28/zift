import Link from 'next/link'

import { auditSeverityLabel } from '@/lib/audit/constants'
import { auditActionLabel, auditHumanSummary } from '@/lib/audit/format'
import {
  auditFilterQuery,
  getAuditFacets,
  listAuditLogEvents,
  parseAuditFilters,
} from '@/lib/audit/queries'
import { requirePermission } from '@/lib/rbac/access'
import { EmptyState, PageHeader, StatCard } from '@/components/dashboard/ui'

interface LogsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function paramsFromRecord(record: Record<string, string | string[] | undefined> | undefined) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(record ?? {})) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item)
    } else if (value) {
      params.set(key, value)
    }
  }
  return params
}

function dateLabel(value: Date): string {
  return value.toLocaleString('es-PA', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function severityClass(severity: string): string {
  if (severity === 'critical') return 'bg-red-50 text-red-700'
  if (severity === 'warning') return 'bg-amber-50 text-amber-700'
  if (severity === 'notice') return 'bg-sky-50 text-sky-700'
  return 'bg-slate-100 text-slate-700'
}

export default async function LogsPage({ searchParams }: LogsPageProps) {
  await requirePermission('audit.read')
  const params = paramsFromRecord(await searchParams)
  const filters = parseAuditFilters(params)
  const [events, facets] = await Promise.all([listAuditLogEvents(filters), getAuditFacets()])
  const exportHref = `/dashboard/logs/export.csv${auditFilterQuery(filters)}`
  const auditCount = events.filter((event) => event.kind === 'audit').length
  const warningCount = events.filter(
    (event) => event.severity === 'warning' || event.severity === 'critical',
  ).length

  return (
    <main className="px-6 py-8 lg:px-10">
      <PageHeader
        actions={
          <Link
            className="rounded-md bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white"
            href={exportHref}
          >
            Exportar CSV
          </Link>
        }
        description="Trazabilidad administrativa con usuario, fecha, accion, recurso, IP, navegador y cambios antes/despues cuando aplica."
        eyebrow="Auditoria"
        title="Logs"
      />

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <StatCard
          label="Eventos visibles"
          value={String(events.length)}
          helper="Segun filtros activos."
        />
        <StatCard
          label="Con diff"
          value={String(auditCount)}
          helper="Registros con before/after."
        />
        <StatCard label="Alertas" value={String(warningCount)} helper="Warning o critico." />
      </section>

      <form className="mt-8 grid gap-3 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm xl:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto]">
        <input
          className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
          defaultValue={filters.query}
          name="q"
          placeholder="Buscar usuario, accion, recurso, IP..."
        />
        <select
          className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
          defaultValue={filters.action ?? ''}
          name="action"
        >
          <option value="">Todas las acciones</option>
          {facets.actions.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
          defaultValue={filters.entity ?? ''}
          name="entity"
        >
          <option value="">Todos los recursos</option>
          {facets.entities.map((entity) => (
            <option key={entity} value={entity}>
              {entity}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
          defaultValue={filters.severity ?? ''}
          name="severity"
        >
          <option value="">Todas las severidades</option>
          {facets.severities.map((severity) => (
            <option key={severity} value={severity}>
              {auditSeverityLabel[severity as keyof typeof auditSeverityLabel] ?? severity}
            </option>
          ))}
        </select>
        <input
          className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
          defaultValue={filters.ip}
          name="ip"
          placeholder="IP"
        />
        <button className="h-10 rounded-md border border-[var(--line)] px-4 text-sm font-semibold">
          Filtrar
        </button>
        <input
          className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
          defaultValue={filters.dateFrom}
          name="from"
          type="date"
        />
        <input
          className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
          defaultValue={filters.dateTo}
          name="to"
          type="date"
        />
      </form>

      <section className="mt-8 overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-sm">
        {events.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--line)] text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Accion</th>
                  <th className="px-4 py-3">Recurso</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3">Severidad</th>
                  <th className="px-4 py-3">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {events.map((event) => (
                  <tr key={`${event.kind}:${event.id}`}>
                    <td className="px-4 py-3 text-[var(--muted)]">{dateLabel(event.createdAt)}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{event.actorName ?? 'Sistema'}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {event.actorEmail ?? event.source}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{auditActionLabel(event.action)}</p>
                      <p className="mt-1 max-w-md text-xs leading-5 text-[var(--muted)]">
                        {auditHumanSummary(event)}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--muted)]">
                      {event.entityType ? `${event.entityType}:${event.entityId ?? 'N/A'}` : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">{event.ipAddress ?? 'N/A'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${severityClass(event.severity)}`}
                      >
                        {auditSeverityLabel[event.severity]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        className="font-semibold underline"
                        href={`/dashboard/logs/${event.id}`}
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <EmptyState
              message="Prueba ajustar los filtros o ejecutar una accion administrativa auditable."
              title="Sin logs para estos filtros"
            />
          </div>
        )}
      </section>
    </main>
  )
}
