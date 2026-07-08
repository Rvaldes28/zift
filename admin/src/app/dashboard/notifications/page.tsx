import Link from 'next/link'

import { EmptyState, PageHeader, StatCard } from '@/components/dashboard/ui'
import { CsrfField } from '@/components/security/csrf-field'
import {
  retryNotificationDeliveryAction,
  updateNotificationStatusAction,
} from '@/lib/notifications/actions'
import { channelLabel, severityLabel, statusLabel } from '@/lib/notifications/constants'
import {
  getNotificationInbox,
  getNotificationStats,
  type NotificationFilters,
} from '@/lib/notifications/queries'
import { requirePermission } from '@/lib/rbac/access'

interface NotificationsPageProps {
  searchParams?: Promise<NotificationFilters & { result?: string }>
}

function dateLabel(value: Date | null): string {
  if (!value) return 'Pendiente'
  return new Intl.DateTimeFormat('es-PA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value)
}

function severityClasses(severity: string): string {
  if (severity === 'critical') return 'bg-red-50 text-red-700'
  if (severity === 'warning') return 'bg-amber-50 text-amber-700'
  return 'bg-sky-50 text-sky-700'
}

function statusMessage(status?: string): string | null {
  const messages: Record<string, string> = {
    ack: 'Notificacion reconocida.',
    invalid: 'No se encontro la notificacion.',
    read: 'Notificacion marcada como leida.',
    resolve: 'Notificacion resuelta.',
    retried: 'Delivery reintentado.',
    retry_failed: 'No se pudo reintentar el delivery.',
  }
  return status ? (messages[status] ?? null) : null
}

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const [{ access }, params, stats] = await Promise.all([
    requirePermission('settings.read'),
    searchParams,
    getNotificationStats(),
  ])
  const inbox = await getNotificationInbox(params)
  const canManage = access.permissions.includes('settings.manage')
  const message = statusMessage(params?.result)

  return (
    <main className="px-6 py-8 lg:px-10">
      <PageHeader
        eyebrow="Sistema"
        title="Notificaciones"
        description="Eventos criticos del dashboard, web publica, seguridad, backups, pagos y performance."
        actions={
          <Link
            className="h-10 rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold transition hover:border-[var(--ink)]"
            href="/dashboard/notifications/settings"
          >
            Reglas y canales
          </Link>
        }
      />

      {message && (
        <section className="mt-6 rounded-lg border border-[var(--line)] bg-white p-4 text-sm shadow-sm">
          {message}
        </section>
      )}

      <section className="mt-8 grid gap-4 md:grid-cols-4">
        <StatCard label="Abiertas" value={String(stats.open)} helper="Pendientes de revisar." />
        <StatCard
          label="Criticas"
          value={String(stats.critical)}
          helper="Requieren respuesta rapida."
        />
        <StatCard label="No leidas" value={String(stats.unread)} helper="Badge del header." />
        <StatCard
          label="Deliveries fallidos"
          value={String(stats.failedDeliveries)}
          helper="Canales externos por reintentar."
        />
      </section>

      <form className="mt-8 grid gap-3 rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm md:grid-cols-4">
        <select
          className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
          defaultValue={inbox.filters.status}
          name="status"
        >
          <option value="open">Abiertas</option>
          <option value="acknowledged">Reconocidas</option>
          <option value="resolved">Resueltas</option>
        </select>
        <select
          className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
          defaultValue={inbox.filters.severity ?? ''}
          name="severity"
        >
          <option value="">Todas las severidades</option>
          <option value="critical">Criticas</option>
          <option value="warning">Warnings</option>
          <option value="info">Info</option>
        </select>
        <select
          className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
          defaultValue={inbox.filters.channel ?? ''}
          name="channel"
        >
          <option value="">Todos los canales</option>
          {['dashboard', 'email', 'slack', 'telegram', 'whatsapp', 'push'].map((channel) => (
            <option key={channel} value={channel}>
              {channelLabel(channel)}
            </option>
          ))}
        </select>
        <button className="h-10 rounded-md bg-[var(--ink)] px-4 text-sm font-semibold text-white">
          Filtrar
        </button>
      </form>

      <section className="mt-8 rounded-lg border border-[var(--line)] bg-white shadow-sm">
        {inbox.rows.length > 0 ? (
          <div className="divide-y divide-[var(--line)]">
            {inbox.rows.map((notification) => (
              <article className="p-5" key={notification.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${severityClasses(notification.severity)}`}
                      >
                        {severityLabel(notification.severity)}
                      </span>
                      <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)]">
                        {statusLabel(notification.status)}
                      </span>
                      <span className="text-xs text-[var(--muted)]">
                        {dateLabel(notification.createdAt)}
                      </span>
                    </div>
                    <h2 className="mt-3 text-lg font-semibold">{notification.title}</h2>
                    {notification.body && (
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                        {notification.body}
                      </p>
                    )}
                    <p className="mt-2 font-mono text-xs text-[var(--muted)]">
                      {notification.eventType} · {notification.source}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {notification.status === 'open' && (
                      <>
                        <form action={updateNotificationStatusAction}>
                          <CsrfField />
                          <input name="id" type="hidden" value={notification.id} />
                          <input name="action" type="hidden" value="read" />
                          <button className="h-9 rounded-md border border-[var(--line)] px-3 text-sm font-semibold">
                            Leida
                          </button>
                        </form>
                        <form action={updateNotificationStatusAction}>
                          <CsrfField />
                          <input name="id" type="hidden" value={notification.id} />
                          <input name="action" type="hidden" value="ack" />
                          <button className="h-9 rounded-md border border-[var(--line)] px-3 text-sm font-semibold">
                            Reconocer
                          </button>
                        </form>
                      </>
                    )}
                    {notification.status !== 'resolved' && (
                      <form action={updateNotificationStatusAction}>
                        <CsrfField />
                        <input name="id" type="hidden" value={notification.id} />
                        <input name="action" type="hidden" value="resolve" />
                        <button className="h-9 rounded-md bg-[var(--ink)] px-3 text-sm font-semibold text-white">
                          Resolver
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(notification.channels as string[]).map((channel) => (
                    <span
                      className="rounded-full bg-[var(--background)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)]"
                      key={channel}
                    >
                      {channelLabel(channel)}
                    </span>
                  ))}
                </div>

                {notification.deliveries.length > 0 && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <tbody>
                        {notification.deliveries.map((delivery) => (
                          <tr className="border-t border-[var(--line)]" key={delivery.id}>
                            <td className="py-2 pr-3 font-semibold">
                              {channelLabel(delivery.channel)}
                            </td>
                            <td className="px-3 py-2 text-[var(--muted)]">{delivery.status}</td>
                            <td className="px-3 py-2 text-[var(--muted)]">
                              {delivery.errorMessage ?? 'OK'}
                            </td>
                            <td className="py-2 pl-3 text-right">
                              {delivery.status === 'failed' && canManage && (
                                <form action={retryNotificationDeliveryAction}>
                                  <CsrfField />
                                  <input name="deliveryId" type="hidden" value={delivery.id} />
                                  <button className="font-semibold text-[var(--zift)]">
                                    Reintentar
                                  </button>
                                </form>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Sin notificaciones"
            message="Cuando llegue un lead, falle un backup o aparezca una alerta critica, quedara registrado aqui."
          />
        )}
      </section>
    </main>
  )
}
