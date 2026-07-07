import Link from 'next/link'

import { EmptyState, PageHeader, StatCard } from '@/components/dashboard/ui'
import {
  LEAD_FORM_LABELS,
  LEAD_STATUSES,
  leadFormLabel,
  leadStatusLabel,
} from '@/lib/leads/constants'
import {
  getLeadStats,
  listAssignableUsers,
  listLeadServices,
  listLeads,
  parseLeadFilters,
  type LeadFilters,
} from '@/lib/leads/queries'
import { requirePermission } from '@/lib/rbac/access'

interface LeadsPageProps {
  searchParams?: Promise<LeadFilters & { error?: string; statusMessage?: string }>
}

function dateLabel(date: Date): string {
  return new Intl.DateTimeFormat('es', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function filterQuery(params: LeadFilters | undefined): string {
  const query = new URLSearchParams()
  for (const key of ['q', 'status', 'formType', 'serviceId', 'assignedTo', 'dateFrom', 'dateTo']) {
    const value = params?.[key as keyof LeadFilters]
    if (value) query.set(key, value)
  }

  const serialized = query.toString()
  return serialized ? `?${serialized}` : ''
}

function statusClasses(status: string): string {
  const tone: Record<string, string> = {
    contacted: 'bg-blue-50 text-blue-700',
    converted: 'bg-emerald-50 text-emerald-700',
    follow_up: 'bg-amber-50 text-amber-700',
    lost: 'bg-slate-100 text-slate-700',
    new: 'bg-violet-50 text-violet-700',
    spam: 'bg-red-50 text-red-700',
  }

  return `rounded-full px-2.5 py-1 text-xs font-semibold ${tone[status] ?? 'bg-slate-100 text-slate-700'}`
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const { access } = await requirePermission('leads.read')
  const params = await searchParams
  const filters = parseLeadFilters(params ?? {})
  const [leads, stats, services, assignees] = await Promise.all([
    listLeads(filters),
    getLeadStats(filters),
    listLeadServices(),
    listAssignableUsers(),
  ])
  const exportHref = `/dashboard/leads/export.csv${filterQuery(filters)}`

  return (
    <main className="px-6 py-8 lg:px-10">
      <PageHeader
        eyebrow="CRM"
        title="Leads"
        description="Centro de captacion comercial para contactos, asesorias y cotizaciones recibidas desde la web."
        actions={
          <Link
            href={exportHref}
            className="inline-flex h-11 items-center rounded-md border border-[var(--line)] bg-white px-4 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--ink)]"
          >
            Exportar CSV
          </Link>
        }
      />

      {params?.error === 'invalid' && (
        <p className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          La accion no se pudo completar.
        </p>
      )}
      {params?.statusMessage === 'deleted' && (
        <p className="mt-6 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Lead eliminado.
        </p>
      )}

      <section className="mt-8 grid gap-4 md:grid-cols-5">
        <StatCard label="Total" value={String(stats.total)} helper="Filtrados por esta vista." />
        <StatCard
          label="Nuevos"
          value={String(stats.new)}
          helper="Pendientes de primer contacto."
        />
        <StatCard
          label="Seguimiento"
          value={String(stats.followUp)}
          helper="Oportunidades abiertas."
        />
        <StatCard label="Convertidos" value={String(stats.converted)} helper="Leads ganados." />
        <StatCard
          label="Perdidos/spam"
          value={String(stats.lostOrSpam)}
          helper="Cerrados sin oportunidad."
        />
      </section>

      <form className="mt-8 grid gap-3 rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm lg:grid-cols-[1.3fr_repeat(6,minmax(0,1fr))_auto]">
        <input
          name="q"
          defaultValue={params?.q}
          placeholder="Buscar nombre, email, telefono o mensaje"
          className="h-10 rounded-md border border-[var(--line)] px-3 text-sm outline-none transition focus:border-[var(--zift)]"
        />
        <select
          name="status"
          defaultValue={params?.status ?? ''}
          className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
        >
          <option value="">Todos los estados</option>
          {LEAD_STATUSES.map((status) => (
            <option key={status} value={status}>
              {leadStatusLabel(status)}
            </option>
          ))}
        </select>
        <select
          name="formType"
          defaultValue={params?.formType ?? ''}
          className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
        >
          <option value="">Todos los formularios</option>
          {Object.entries(LEAD_FORM_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          name="serviceId"
          defaultValue={params?.serviceId ?? ''}
          className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
        >
          <option value="">Todos los servicios</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.title}
            </option>
          ))}
        </select>
        <select
          name="assignedTo"
          defaultValue={params?.assignedTo ?? ''}
          className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
        >
          <option value="">Todos los responsables</option>
          <option value="unassigned">Sin responsable</option>
          {assignees.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          name="dateFrom"
          defaultValue={params?.dateFrom}
          className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
        />
        <input
          type="date"
          name="dateTo"
          defaultValue={params?.dateTo}
          className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
        />
        <button
          type="submit"
          className="h-10 rounded-md bg-[var(--ink)] px-4 text-sm font-semibold text-white"
        >
          Filtrar
        </button>
      </form>

      <section className="mt-6 overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-sm">
        <div className="grid grid-cols-[1fr_1fr_0.9fr_0.9fr_0.8fr_0.8fr] border-b border-[var(--line)] bg-[var(--background)] px-4 py-3 text-xs font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
          <span>Contacto</span>
          <span>Mensaje</span>
          <span>Servicio</span>
          <span>Estado</span>
          <span>Responsable</span>
          <span>Fecha</span>
        </div>
        {leads.map((lead) => (
          <Link
            key={lead.id}
            href={`/dashboard/leads/${lead.id}`}
            className="grid grid-cols-[1fr_1fr_0.9fr_0.9fr_0.8fr_0.8fr] gap-3 border-b border-[var(--line)] px-4 py-4 text-sm transition hover:bg-[var(--background)]"
          >
            <span className="min-w-0">
              <span className="block truncate font-semibold">{lead.name}</span>
              <span className="block truncate text-[var(--muted)]">{lead.email}</span>
              {lead.phone && (
                <span className="block truncate text-[var(--muted)]">{lead.phone}</span>
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-[var(--muted)]">
                {leadFormLabel(lead.formType)}
              </span>
              <span className="line-clamp-2 text-[var(--muted)]">
                {lead.message || lead.source}
              </span>
            </span>
            <span className="text-[var(--muted)]">{lead.serviceTitle ?? 'Sin servicio'}</span>
            <span>
              <span className={statusClasses(lead.status)}>{leadStatusLabel(lead.status)}</span>
            </span>
            <span className="text-[var(--muted)]">
              {lead.assignedUserName ?? 'Sin responsable'}
            </span>
            <span className="text-[var(--muted)]">{dateLabel(lead.createdAt)}</span>
          </Link>
        ))}
        {leads.length === 0 && (
          <div className="p-4">
            <EmptyState
              title="No hay leads para ese filtro"
              message={
                access.permissions.includes('leads.manage')
                  ? 'Prueba ajustar los filtros o envia un formulario desde la web para validar el flujo.'
                  : 'No hay contactos visibles con los filtros actuales.'
              }
            />
          </div>
        )}
      </section>
    </main>
  )
}
