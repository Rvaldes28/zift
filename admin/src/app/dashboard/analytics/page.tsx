import { EmptyState, PageHeader, StatCard } from '@/components/dashboard/ui'
import type { ReactNode } from 'react'
import {
  getAnalyticsDashboard,
  parseAnalyticsFilters,
  type AnalyticsFilters,
  type IntegrationRow,
  type MetricRow,
} from '@/lib/analytics/queries'
import { leadStatusLabel } from '@/lib/leads/constants'
import { requirePermission } from '@/lib/rbac/access'

interface AnalyticsPageProps {
  searchParams?: Promise<AnalyticsFilters>
}

function rangeHref(range: string) {
  return `/dashboard/analytics?range=${range}`
}

function numberLabel(value: number): string {
  return new Intl.NumberFormat('es-PA').format(value)
}

function RowList({
  empty,
  rows,
  transformLabel,
}: {
  empty: string
  rows: MetricRow[]
  transformLabel?: (label: string) => string
}) {
  const max = Math.max(...rows.map((row) => row.value), 1)

  if (rows.length === 0) {
    return <p className="text-sm text-[var(--muted)]">{empty}</p>
  }

  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <div key={row.label} className="grid gap-1.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-medium">{transformLabel?.(row.label) ?? row.label}</span>
            <span className="text-[var(--muted)]">{numberLabel(row.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--background)]">
            <div
              className="h-full rounded-full bg-[var(--zift)]"
              style={{ width: `${Math.max(6, (row.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function Panel({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function Integrations({ rows }: { rows: IntegrationRow[] }) {
  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <article
          key={row.label}
          className="flex items-start justify-between gap-4 rounded-md border border-[var(--line)] p-3"
        >
          <div>
            <p className="text-sm font-semibold">{row.label}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{row.description}</p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              row.configured ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {row.configured ? 'Configurado' : 'No configurado'}
          </span>
        </article>
      ))}
    </div>
  )
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  await requirePermission('analytics.read')
  const params = await searchParams
  const selectedRange = parseAnalyticsFilters(params)
  const dashboard = await getAnalyticsDashboard(params)
  const maxDaily = Math.max(
    ...dashboard.dailyRows.map((row) => Math.max(row.pageViews, row.leads)),
    1,
  )

  return (
    <main className="px-6 py-8 lg:px-10">
      <PageHeader
        eyebrow="Medicion"
        title="Analytics"
        description={`Metricas propias de trafico, eventos y conversion comercial. ${dashboard.range.label}.`}
      />

      <section className="mt-8 flex flex-wrap items-end gap-3 rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
        {['7d', '30d', '90d'].map((range) => (
          <a
            key={range}
            href={rangeHref(range)}
            className={`inline-flex h-10 items-center rounded-md px-4 text-sm font-semibold ${
              selectedRange.preset === range
                ? 'bg-[var(--ink)] text-white'
                : 'border border-[var(--line)] text-[var(--ink)]'
            }`}
          >
            {range}
          </a>
        ))}
        <form className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="range" value="custom" />
          <label className="grid gap-1 text-xs font-semibold text-[var(--muted)]">
            Desde
            <input
              type="date"
              name="dateFrom"
              defaultValue={params?.dateFrom}
              className="h-10 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--ink)]"
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-[var(--muted)]">
            Hasta
            <input
              type="date"
              name="dateTo"
              defaultValue={params?.dateTo}
              className="h-10 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--ink)]"
            />
          </label>
          <button className="h-10 rounded-md bg-[var(--zift)] px-4 text-sm font-semibold text-white">
            Aplicar
          </button>
        </form>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-5">
        <StatCard label="Visitas" value={numberLabel(dashboard.pageViews)} />
        <StatCard label="Sesiones" value={numberLabel(dashboard.sessions)} />
        <StatCard label="Leads" value={numberLabel(dashboard.leads)} />
        <StatCard label="Conversion" value={`${dashboard.conversionRate}%`} />
        <StatCard label="Rebote" value={`${dashboard.bounceRate}%`} />
      </section>

      <section className="mt-8 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Visitas y leads por dia</h2>
          <p className="text-sm text-[var(--muted)]">
            Tiempo promedio: {dashboard.averageDurationSeconds}s por pagina
          </p>
        </div>
        <div className="mt-5 grid gap-3">
          {dashboard.dailyRows.map((row) => (
            <div key={row.date} className="grid gap-2 md:grid-cols-[120px_1fr_90px]">
              <time className="text-sm text-[var(--muted)]">{row.date}</time>
              <div className="grid gap-1">
                <div className="h-2 overflow-hidden rounded-full bg-[var(--background)]">
                  <div
                    className="h-full rounded-full bg-[var(--zift)]"
                    style={{ width: `${Math.max(2, (row.pageViews / maxDaily) * 100)}%` }}
                  />
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--background)]">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{
                      width: `${Math.max(row.leads > 0 ? 2 : 0, (row.leads / maxDaily) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <span className="text-sm text-[var(--muted)]">
                {row.pageViews} / {row.leads}
              </span>
            </div>
          ))}
        </div>
      </section>

      {dashboard.pageViews === 0 && dashboard.leads === 0 && (
        <div className="mt-8">
          <EmptyState
            title="Sin datos para este rango"
            message="Cuando la web capture pageviews consentidos o entren leads, esta vista empezara a mostrar metricas utiles."
          />
        </div>
      )}

      <section className="mt-8 grid gap-5 xl:grid-cols-3">
        <Panel title="Fuentes de trafico">
          <RowList empty="Sin fuentes registradas." rows={dashboard.sourceRows} />
        </Panel>
        <Panel title="Eventos importantes">
          <RowList empty="Sin eventos registrados." rows={dashboard.eventRows} />
        </Panel>
        <Panel title="CTAs principales">
          <RowList empty="Sin clicks registrados." rows={dashboard.ctaRows} />
        </Panel>
        <Panel title="Leads por estado">
          <RowList
            empty="Sin leads en el rango."
            rows={dashboard.leadStatusRows}
            transformLabel={leadStatusLabel}
          />
        </Panel>
        <Panel title="Dispositivos">
          <RowList empty="Sin dispositivos registrados." rows={dashboard.deviceRows} />
        </Panel>
        <Panel title="Navegadores">
          <RowList empty="Sin navegadores registrados." rows={dashboard.browserRows} />
        </Panel>
        <Panel title="Sistemas">
          <RowList empty="Sin sistemas registrados." rows={dashboard.osRows} />
        </Panel>
        <Panel title="Paises">
          <RowList empty="Sin paises registrados." rows={dashboard.countryRows} />
        </Panel>
        <Panel title="Ciudades">
          <RowList empty="Sin ciudades registradas." rows={dashboard.cityRows} />
        </Panel>
      </section>

      <section className="mt-8">
        <Panel title="Integraciones externas">
          <Integrations rows={dashboard.integrationRows} />
        </Panel>
      </section>
    </main>
  )
}
