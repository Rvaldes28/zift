import { EmptyState, PageHeader, StatCard } from '@/components/dashboard/ui'
import { CsrfField } from '@/components/security/csrf-field'
import { runPerformanceChecksAction } from '@/lib/performance/actions'
import {
  PERFORMANCE_RANGES,
  getPerformanceDashboard,
  parsePerformanceFilters,
  type PerformanceAlertRow,
  type PerformanceCheckRow,
  type PerformanceFilters,
  type PerformanceMetricRow,
} from '@/lib/performance/queries'
import { requirePermission } from '@/lib/rbac/access'
import type { ReactNode } from 'react'

interface PerformancePageProps {
  searchParams?: Promise<PerformanceFilters>
}

function rangeHref(range: string) {
  return `/dashboard/performance?range=${range}`
}

function numberLabel(value: number): string {
  return new Intl.NumberFormat('es-PA').format(value)
}

function msLabel(value: number): string {
  return value > 0 ? `${Math.round(value)} ms` : 'Sin datos'
}

function clsLabel(value: number): string {
  return value > 0 ? value.toFixed(3) : 'Sin datos'
}

function Panel({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function statusClasses(status: string | undefined): string {
  if (status === 'critical' || status === 'failed') return 'bg-red-50 text-red-700'
  if (status === 'warning') return 'bg-amber-50 text-amber-700'
  return 'bg-emerald-50 text-emerald-700'
}

function MetricList({ empty, rows }: { empty: string; rows: PerformanceMetricRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-[var(--muted)]">{empty}</p>
  }

  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <article
          key={`${row.label}-${row.value}`}
          className="grid gap-3 rounded-md border border-[var(--line)] p-3 md:grid-cols-[1fr_auto]"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{row.label}</p>
            {row.url && <p className="mt-1 truncate text-xs text-[var(--muted)]">{row.url}</p>}
            {row.helper && (
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{row.helper}</p>
            )}
          </div>
          <div className="flex items-center gap-2 md:justify-end">
            {row.count !== undefined && (
              <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)]">
                {row.count}
              </span>
            )}
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(row.status)}`}
            >
              {row.value}
            </span>
          </div>
        </article>
      ))}
    </div>
  )
}

function ChecksTable({ rows }: { rows: PerformanceCheckRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">Aun no hay checks sinteticos en este rango.</p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-[var(--line)] text-sm">
        <thead>
          <tr className="text-left text-xs font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
            <th className="py-3 pr-4">Ruta</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">HTTP</th>
            <th className="px-4 py-3">Tiempo</th>
            <th className="px-4 py-3">Cache/CDN</th>
            <th className="py-3 pl-4">Fecha</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--line)]">
          {rows.map((row) => (
            <tr key={`${row.url}-${row.checkedAt}`}>
              <td className="max-w-[320px] py-3 pr-4">
                <p className="truncate font-medium">{row.url}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {row.method} · {row.kind}
                </p>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(row.status)}`}
                >
                  {row.status}
                </span>
              </td>
              <td className="px-4 py-3 text-[var(--muted)]">{row.httpStatus}</td>
              <td className="px-4 py-3 font-medium">{row.responseTime}</td>
              <td className="px-4 py-3 text-[var(--muted)]">
                <p>{row.cacheStatus}</p>
                <p className="mt-1 text-xs">{row.cdnStatus}</p>
              </td>
              <td className="py-3 pl-4 text-[var(--muted)]">{row.checkedAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AlertList({ rows }: { rows: PerformanceAlertRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-[var(--muted)]">No hay alertas abiertas.</p>
  }

  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <article
          key={`${row.title}-${row.url}`}
          className="rounded-md border border-[var(--line)] p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{row.title}</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{row.message}</p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(row.severity)}`}
            >
              {row.severity}
            </span>
          </div>
          <p className="mt-3 truncate text-xs text-[var(--muted)]">{row.url}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {row.metric}: {row.value} · {row.lastSeenAt}
          </p>
        </article>
      ))}
    </div>
  )
}

export default async function PerformancePage({ searchParams }: PerformancePageProps) {
  await requirePermission('performance.read')
  const params = await searchParams
  const selectedRange = parsePerformanceFilters(params).preset
  const dashboard = await getPerformanceDashboard(params)

  return (
    <main className="px-6 py-8 lg:px-10">
      <PageHeader
        eyebrow="Sistema"
        title="Performance"
        description={`RUM consentido, Core Web Vitals, checks sinteticos, cache/CDN y alertas persistidas. ${dashboard.range.label}.`}
        actions={
          <form action={runPerformanceChecksAction}>
            <CsrfField />
            <button className="h-10 rounded-md bg-[var(--ink)] px-4 text-sm font-semibold text-white">
              Ejecutar checks
            </button>
          </form>
        }
      />

      {params?.checks && (
        <section className="mt-6 rounded-lg border border-[var(--line)] bg-white p-4 text-sm shadow-sm">
          {params.checks === 'ok'
            ? 'Checks ejecutados sin fallos criticos.'
            : 'Checks ejecutados: hay rutas que requieren revision.'}
        </section>
      )}

      <section className="mt-8 flex flex-wrap gap-3 rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
        {PERFORMANCE_RANGES.map((range) => (
          <a
            key={range}
            href={rangeHref(range)}
            className={`inline-flex h-10 items-center rounded-md px-4 text-sm font-semibold ${
              selectedRange === range
                ? 'bg-[var(--ink)] text-white'
                : 'border border-[var(--line)] text-[var(--ink)]'
            }`}
          >
            {range}
          </a>
        ))}
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Salud"
          value={`${dashboard.healthScore}/100`}
          helper={dashboard.healthLabel}
        />
        <StatCard
          label="LCP p75"
          value={msLabel(dashboard.lcpP75Ms)}
          helper="Objetivo: < 2500 ms"
        />
        <StatCard label="CLS p75" value={clsLabel(dashboard.clsP75)} helper="Objetivo: < 0.100" />
        <StatCard label="INP p75" value={msLabel(dashboard.inpP75Ms)} helper="Objetivo: < 200 ms" />
        <StatCard
          label="API p75"
          value={msLabel(dashboard.apiResponseP75Ms)}
          helper="Formularios y APIs medidas"
        />
        <StatCard
          label="Alertas"
          value={numberLabel(dashboard.openAlerts)}
          helper={`${dashboard.recentErrors} errores recientes`}
        />
      </section>

      {dashboard.webVitalSamples === 0 && dashboard.checkRows.length === 0 && (
        <div className="mt-8">
          <EmptyState
            title="Aun no hay mediciones"
            message="Acepta cookies analytics en la web para enviar RUM, o ejecuta checks manuales para empezar a poblar esta vista."
          />
        </div>
      )}

      <section className="mt-8 grid gap-5 xl:grid-cols-2">
        <Panel title="Paginas lentas">
          <MetricList empty="Sin rutas lentas detectadas." rows={dashboard.slowPageRows} />
        </Panel>
        <Panel title="Imagenes y recursos pesados">
          <MetricList empty="Sin recursos pesados detectados." rows={dashboard.heavyResourceRows} />
        </Panel>
        <Panel title="Errores de carga y formularios">
          <MetricList empty="Sin errores recientes." rows={dashboard.errorRows} />
        </Panel>
        <Panel title="Alertas abiertas">
          <AlertList rows={dashboard.alerts} />
        </Panel>
      </section>

      <section className="mt-8">
        <Panel title="Checks sinteticos">
          <ChecksTable rows={dashboard.checkRows} />
        </Panel>
      </section>
    </main>
  )
}
