import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PageHeader, StatCard } from '@/components/dashboard/ui'
import { CsrfField } from '@/components/security/csrf-field'
import { addLeadNote, assignLead, sendLeadToCrmAction, updateLeadStatus } from '@/lib/leads/actions'
import { LEAD_STATUSES, leadFormLabel, leadStatusLabel } from '@/lib/leads/constants'
import { getLeadDetail, listAssignableUsers } from '@/lib/leads/queries'
import { requirePermission } from '@/lib/rbac/access'

interface LeadDetailPageProps {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ crm?: string; error?: string; status?: string }>
}

function dateLabel(date: Date | null): string {
  if (!date) return 'Pendiente'
  return new Intl.DateTimeFormat('es', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function jsonBlock(value: Record<string, unknown>): string {
  return Object.keys(value).length > 0 ? JSON.stringify(value, null, 2) : 'Sin datos'
}

function statusMessage(params: Awaited<LeadDetailPageProps['searchParams']>) {
  if (params?.status === 'updated') return 'Estado actualizado.'
  if (params?.status === 'assigned') return 'Responsable actualizado.'
  if (params?.status === 'note-added') return 'Nota agregada.'
  if (params?.crm === 'sent') return 'Lead enviado al CRM.'
  if (params?.crm === 'failed') return 'No se pudo enviar al CRM.'
  if (params?.crm === 'skipped') return 'CRM webhook no configurado.'
  if (params?.error === 'invalid') return 'La accion no se pudo completar.'
  return null
}

export default async function LeadDetailPage({ params, searchParams }: LeadDetailPageProps) {
  const [{ access }, { id }, query] = await Promise.all([
    requirePermission('leads.read'),
    params,
    searchParams,
  ])
  const [lead, assignees] = await Promise.all([getLeadDetail(id), listAssignableUsers()])
  if (!lead) notFound()

  const canManage = access.permissions.includes('leads.manage')
  const notice = statusMessage(query)

  return (
    <main className="px-6 py-8 lg:px-10">
      <PageHeader
        eyebrow="Lead"
        title={lead.name}
        description={`${leadFormLabel(lead.formType)} recibido el ${dateLabel(lead.createdAt)}.`}
        actions={
          <Link
            href="/dashboard/leads"
            className="inline-flex h-11 items-center rounded-md border border-[var(--line)] bg-white px-4 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--ink)]"
          >
            Volver a leads
          </Link>
        }
      />

      {notice && (
        <p className="mt-6 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>
      )}

      <section className="mt-8 grid gap-4 md:grid-cols-4">
        <StatCard label="Estado" value={leadStatusLabel(lead.status)} />
        <StatCard label="Formulario" value={leadFormLabel(lead.formType)} />
        <StatCard label="CRM" value={lead.crmStatus ?? 'Pendiente'} />
        <StatCard
          label="Responsable"
          value={lead.assignedUserName ?? 'Sin responsable'}
          helper={lead.assignedUserEmail ?? undefined}
        />
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-6">
          <article className="rounded-lg border border-[var(--line)] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Datos del contacto</h2>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                  Email
                </dt>
                <dd className="mt-1">
                  <a className="text-[var(--zift)] hover:underline" href={`mailto:${lead.email}`}>
                    {lead.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                  Telefono
                </dt>
                <dd className="mt-1">{lead.phone || 'No informado'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                  Empresa
                </dt>
                <dd className="mt-1">{lead.company || 'No informada'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                  Servicio
                </dt>
                <dd className="mt-1">{lead.serviceTitle || 'Sin servicio solicitado'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                  Presupuesto
                </dt>
                <dd className="mt-1">{lead.budget || 'No informado'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                  Source
                </dt>
                <dd className="mt-1">{lead.source || 'No informado'}</dd>
              </div>
            </dl>
            <div className="mt-6 border-t border-[var(--line)] pt-5">
              <h3 className="text-sm font-semibold">Mensaje</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">
                {lead.message || 'Sin mensaje.'}
              </p>
            </div>
          </article>

          <article className="rounded-lg border border-[var(--line)] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Notas internas</h2>
            {canManage && (
              <form action={addLeadNote} className="mt-5 grid gap-3">
                <CsrfField />
                <input type="hidden" name="leadId" value={lead.id} />
                <textarea
                  name="body"
                  rows={4}
                  required
                  minLength={2}
                  maxLength={5000}
                  placeholder="Agregar seguimiento, acuerdo o contexto comercial..."
                  className="rounded-md border border-[var(--line)] px-3 py-2 text-sm outline-none transition focus:border-[var(--zift)]"
                />
                <button
                  type="submit"
                  className="w-fit rounded-md bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white"
                >
                  Agregar nota
                </button>
              </form>
            )}
            <div className="mt-6 space-y-4">
              {lead.notes.map((note) => (
                <article key={note.id} className="rounded-md border border-[var(--line)] p-4">
                  <p className="whitespace-pre-wrap text-sm leading-6">{note.body}</p>
                  <p className="mt-3 text-xs text-[var(--muted)]">
                    {note.authorName ?? note.authorEmail ?? 'Sistema'} · {dateLabel(note.createdAt)}
                  </p>
                </article>
              ))}
              {lead.notes.length === 0 && (
                <p className="text-sm text-[var(--muted)]">Aun no hay notas internas.</p>
              )}
            </div>
          </article>

          <article className="rounded-lg border border-[var(--line)] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Actividad</h2>
            <ol className="mt-5 space-y-3">
              {lead.activity.map((item) => (
                <li key={item.id} className="rounded-md border border-[var(--line)] p-4 text-sm">
                  <p className="font-semibold">{item.action}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {item.actorName ?? item.actorEmail ?? 'Sistema'} · {dateLabel(item.createdAt)}
                  </p>
                </li>
              ))}
              {lead.activity.length === 0 && (
                <p className="text-sm text-[var(--muted)]">Sin actividad registrada.</p>
              )}
            </ol>
          </article>
        </section>

        <aside className="space-y-6">
          <article className="rounded-lg border border-[var(--line)] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Operacion</h2>
            {canManage ? (
              <div className="mt-5 space-y-5">
                <form action={updateLeadStatus} className="grid gap-3">
                  <CsrfField />
                  <input type="hidden" name="leadId" value={lead.id} />
                  <label className="grid gap-2 text-sm font-medium">
                    Estado
                    <select
                      name="status"
                      defaultValue={lead.status}
                      className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
                    >
                      {LEAD_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {leadStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Razon spam <span className="font-normal text-[var(--muted)]">(opcional)</span>
                    <input
                      name="spamReason"
                      defaultValue={lead.spamReason ?? ''}
                      className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
                    />
                  </label>
                  <button
                    type="submit"
                    className="rounded-md bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white"
                  >
                    Actualizar estado
                  </button>
                </form>

                <form action={assignLead} className="grid gap-3 border-t border-[var(--line)] pt-5">
                  <CsrfField />
                  <input type="hidden" name="leadId" value={lead.id} />
                  <label className="grid gap-2 text-sm font-medium">
                    Responsable
                    <select
                      name="assignedTo"
                      defaultValue={lead.assignedTo ?? ''}
                      className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
                    >
                      <option value="">Sin responsable</option>
                      {assignees.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="submit"
                    className="rounded-md bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white"
                  >
                    Asignar
                  </button>
                </form>

                <form
                  action={sendLeadToCrmAction}
                  className="grid gap-3 border-t border-[var(--line)] pt-5"
                >
                  <CsrfField />
                  <input type="hidden" name="leadId" value={lead.id} />
                  <button
                    type="submit"
                    className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold"
                  >
                    Enviar a CRM
                  </button>
                  <p className="text-xs leading-5 text-[var(--muted)]">
                    Ultimo envio: {dateLabel(lead.crmSentAt)}. Estado:{' '}
                    {lead.crmStatus ?? 'pendiente'}.
                  </p>
                </form>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[var(--muted)]">
                Tu rol permite consultar leads, pero no modificarlos.
              </p>
            )}
          </article>

          <article className="rounded-lg border border-[var(--line)] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Datos tecnicos</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="font-semibold">IP</dt>
                <dd className="mt-1 text-[var(--muted)]">{lead.ipAddress ?? 'No registrada'}</dd>
              </div>
              <div>
                <dt className="font-semibold">User agent</dt>
                <dd className="mt-1 break-words text-[var(--muted)]">
                  {lead.userAgent ?? 'No registrado'}
                </dd>
              </div>
              <div>
                <dt className="font-semibold">UTM</dt>
                <dd>
                  <pre className="mt-2 overflow-auto rounded-md bg-[var(--background)] p-3 text-xs">
                    {jsonBlock(lead.utm)}
                  </pre>
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Payload</dt>
                <dd>
                  <pre className="mt-2 max-h-80 overflow-auto rounded-md bg-[var(--background)] p-3 text-xs">
                    {jsonBlock(lead.payload)}
                  </pre>
                </dd>
              </div>
              {lead.crmResponse && (
                <div>
                  <dt className="font-semibold">Respuesta CRM</dt>
                  <dd>
                    <pre className="mt-2 max-h-80 overflow-auto rounded-md bg-[var(--background)] p-3 text-xs">
                      {jsonBlock(lead.crmResponse)}
                    </pre>
                  </dd>
                </div>
              )}
            </dl>
          </article>
        </aside>
      </div>
    </main>
  )
}
