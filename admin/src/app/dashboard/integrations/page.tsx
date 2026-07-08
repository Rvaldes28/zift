import Link from 'next/link'

import { EmptyState, PageHeader, StatCard } from '@/components/dashboard/ui'
import { CsrfField } from '@/components/security/csrf-field'
import {
  sendIntegrationLeadTestAction,
  testIntegrationAction,
  updateIntegrationAction,
} from '@/lib/integrations/actions'
import { leadEnabledIntegrationKeys } from '@/lib/integrations/delivery'
import { getIntegrationOverview, getRecentIntegrationLogs } from '@/lib/integrations/queries'
import { requirePermission } from '@/lib/rbac/access'

interface IntegrationsPageProps {
  searchParams?: Promise<{
    integration?: string
    status?: string
  }>
}

function dateLabel(value: Date | null): string {
  if (!value) return 'Sin check'
  return new Intl.DateTimeFormat('es-PA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value)
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    configured: 'Configurada',
    connected: 'Conectada',
    error: 'Error',
    not_configured: 'Sin configurar',
  }
  return labels[status] ?? status
}

function statusClasses(status: string): string {
  if (status === 'connected') return 'bg-emerald-50 text-emerald-700'
  if (status === 'configured') return 'bg-sky-50 text-sky-700'
  if (status === 'error') return 'bg-red-50 text-red-700'
  return 'bg-slate-100 text-slate-600'
}

function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    ads: 'Ads',
    analytics: 'Analytics',
    automation: 'Automatizacion',
    crm: 'CRM',
    external: 'Externo',
    marketing: 'Marketing',
    messaging: 'Mensajeria',
    payments: 'Pagos',
    seo: 'SEO',
  }
  return labels[category] ?? category
}

function feedback(status?: string): string | null {
  const messages: Record<string, string> = {
    invalid: 'Integracion invalida.',
    lead_failed: 'No se pudo enviar el lead de prueba.',
    lead_sent: 'Lead de prueba enviado o marcado como omitido.',
    saved: 'Integracion actualizada.',
    test_failed: 'La prueba fallo. Revisa el ultimo error.',
    tested: 'Prueba ejecutada.',
  }
  return status ? (messages[status] ?? null) : null
}

function IntegrationForm({
  canManage,
  integration,
}: {
  canManage: boolean
  integration: Awaited<ReturnType<typeof getIntegrationOverview>>[number]
}) {
  const autoLeadSync = integration.metadata.autoLeadSync === true
  const owner = typeof integration.config.owner === 'string' ? integration.config.owner : ''
  const notes = typeof integration.metadata.notes === 'string' ? integration.metadata.notes : ''
  const canSendLead = (leadEnabledIntegrationKeys() as string[]).includes(integration.key)

  return (
    <div className="mt-5 space-y-3 border-t border-[var(--line)] pt-4">
      <form action={updateIntegrationAction} className="grid gap-3">
        <CsrfField />
        <input type="hidden" name="key" value={integration.key} />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-semibold text-[var(--muted)]">
            Responsable
            <input
              className="h-10 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--ink)]"
              defaultValue={owner}
              disabled={!canManage}
              name="owner"
              placeholder="Marketing / Ventas"
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-[var(--muted)]">
            Entorno
            <select
              className="h-10 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--ink)]"
              defaultValue={integration.environment}
              disabled={!canManage}
              name="environment"
            >
              <option value="live">Live</option>
              <option value="sandbox">Sandbox</option>
            </select>
          </label>
        </div>
        <label className="grid gap-1 text-xs font-semibold text-[var(--muted)]">
          Notas operativas
          <textarea
            className="min-h-20 rounded-md border border-[var(--line)] px-3 py-2 text-sm text-[var(--ink)]"
            defaultValue={notes}
            disabled={!canManage}
            name="notes"
            placeholder="Cuenta, owner, alcance o pendiente de OAuth."
          />
        </label>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              defaultChecked={integration.enabled}
              disabled={!canManage}
              name="enabled"
              type="checkbox"
            />
            Activa
          </label>
          {canSendLead && (
            <label className="flex items-center gap-2">
              <input
                defaultChecked={autoLeadSync}
                disabled={!canManage}
                name="autoLeadSync"
                type="checkbox"
              />
              Enviar leads automaticamente
            </label>
          )}
        </div>
        {canManage && (
          <button className="h-10 rounded-md bg-[var(--ink)] px-4 text-sm font-semibold text-white transition hover:bg-black sm:w-fit">
            Guardar
          </button>
        )}
      </form>

      {canManage && (
        <div className="flex flex-wrap gap-2">
          <form action={testIntegrationAction}>
            <CsrfField />
            <input type="hidden" name="key" value={integration.key} />
            <button className="h-9 rounded-md border border-[var(--line)] bg-white px-3 text-sm font-semibold transition hover:border-[var(--ink)]">
              Probar conexion
            </button>
          </form>
          {canSendLead && (
            <form action={sendIntegrationLeadTestAction}>
              <CsrfField />
              <input type="hidden" name="key" value={integration.key} />
              <button className="h-9 rounded-md border border-[var(--line)] bg-white px-3 text-sm font-semibold transition hover:border-[var(--ink)]">
                Enviar lead de prueba
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

export default async function IntegrationsPage({ searchParams }: IntegrationsPageProps) {
  const [{ access }, params, integrations, logs] = await Promise.all([
    requirePermission('settings.read'),
    searchParams,
    getIntegrationOverview(),
    getRecentIntegrationLogs(24),
  ])
  const canManage = access.permissions.includes('settings.manage')
  const message = feedback(params?.status)
  const connectedCount = integrations.filter(
    (integration) => integration.status === 'connected',
  ).length
  const configuredCount = integrations.filter((integration) =>
    ['configured', 'connected'].includes(integration.status),
  ).length
  const enabledCount = integrations.filter((integration) => integration.enabled).length
  const missingSecretsCount = integrations.filter(
    (integration) => integration.env.missingRequired.length > 0,
  ).length

  return (
    <main className="px-6 py-8 lg:px-10">
      <PageHeader
        eyebrow="Sistema"
        title="Integraciones"
        description="Centro de conexiones externas: estado, variables requeridas, pruebas y webhooks sin guardar secretos en la DB."
      />

      {message && (
        <section className="mt-6 rounded-lg border border-[var(--line)] bg-white p-4 text-sm shadow-sm">
          {message}
          {params?.integration && (
            <span className="ml-2 font-mono text-xs text-[var(--muted)]">{params.integration}</span>
          )}
        </section>
      )}

      <section className="mt-8 grid gap-4 md:grid-cols-4">
        <StatCard
          label="Conectadas"
          value={String(connectedCount)}
          helper="Checks HTTP o webhook verificado."
        />
        <StatCard
          label="Configuradas"
          value={String(configuredCount)}
          helper="Variables requeridas presentes."
        />
        <StatCard
          label="Activas"
          value={String(enabledCount)}
          helper="Pueden cargar scripts o ejecutar automatizaciones."
        />
        <StatCard
          label="Pendientes"
          value={String(missingSecretsCount)}
          helper="Faltan env vars requeridas."
        />
      </section>

      <section className="mt-8 grid gap-5 xl:grid-cols-2">
        {integrations.map((integration) => (
          <article
            className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm"
            key={integration.key}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs tracking-[0.16em] text-[var(--muted)] uppercase">
                  {categoryLabel(integration.category)} · {integration.provider}
                </p>
                <h2 className="mt-2 text-xl font-semibold">{integration.name}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{integration.notes}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(integration.status)}`}
              >
                {statusLabel(integration.status)}
              </span>
            </div>

            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold text-[var(--muted)]">Auth</dt>
                <dd className="mt-1">{integration.authType}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-[var(--muted)]">Ultimo check</dt>
                <dd className="mt-1">{dateLabel(integration.lastCheckedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-[var(--muted)]">Docs</dt>
                <dd className="mt-1">
                  <Link
                    className="font-semibold text-[var(--zift)]"
                    href={integration.docsUrl}
                    target="_blank"
                  >
                    Abrir
                  </Link>
                </dd>
              </div>
            </dl>

            {integration.lastError && (
              <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {integration.lastError}
              </p>
            )}

            <div className="mt-5">
              <h3 className="text-sm font-semibold">Variables</h3>
              {integration.env.vars.length > 0 ? (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full divide-y divide-[var(--line)] text-sm">
                    <tbody className="divide-y divide-[var(--line)]">
                      {integration.env.vars.map((envVar) => (
                        <tr key={envVar.name}>
                          <td className="py-2 pr-3 font-mono text-xs">{envVar.name}</td>
                          <td className="px-3 py-2 text-[var(--muted)]">{envVar.label}</td>
                          <td className="py-2 pl-3 text-right">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                envVar.configured
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : envVar.required
                                    ? 'bg-red-50 text-red-700'
                                    : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {envVar.configured
                                ? envVar.maskedValue
                                : envVar.required
                                  ? 'Falta'
                                  : 'Opcional'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Sin variables requeridas; úsala como ficha operativa para APIs futuras.
                </p>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {integration.capabilities.map((capability) => (
                <span
                  className="rounded-full bg-[var(--background)] px-3 py-1 text-xs font-semibold text-[var(--muted)]"
                  key={capability}
                >
                  {capability}
                </span>
              ))}
            </div>

            <IntegrationForm canManage={canManage} integration={integration} />
          </article>
        ))}
      </section>

      <section className="mt-8 rounded-lg border border-[var(--line)] bg-white shadow-sm">
        <div className="border-b border-[var(--line)] px-5 py-4">
          <h2 className="text-lg font-semibold">Logs recientes</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Pruebas, errores, webhooks y envios de leads sin secretos.
          </p>
        </div>
        {logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--line)] text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
                  <th className="py-3 pr-4 pl-5">Fecha</th>
                  <th className="px-4 py-3">Integracion</th>
                  <th className="px-4 py-3">Accion</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="py-3 pr-5 pl-4">Mensaje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-3 pr-4 pl-5 text-[var(--muted)]">
                      {dateLabel(log.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{log.integrationKey}</td>
                    <td className="px-4 py-3">{log.action}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          log.status === 'failed'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 pr-5 pl-4 text-[var(--muted)]">
                      {log.message ?? 'Sin mensaje'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Sin logs todavia"
            message="Ejecuta una prueba de conexion o recibe un webhook para empezar a poblar este historial."
          />
        )}
      </section>
    </main>
  )
}
