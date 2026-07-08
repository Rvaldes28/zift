import { PageHeader, StatCard } from '@/components/dashboard/ui'
import { PushSubscriptionManager } from '@/components/notifications/push-subscription-manager'
import { CsrfField } from '@/components/security/csrf-field'
import {
  sendTestNotificationAction,
  updateNotificationRuleAction,
} from '@/lib/notifications/actions'
import { channelLabel, severityLabel } from '@/lib/notifications/constants'
import { getNotificationRules, getNotificationSettingsOverview } from '@/lib/notifications/queries'
import { requirePermission } from '@/lib/rbac/access'
import { createCsrfToken } from '@/lib/security/csrf'

interface NotificationSettingsPageProps {
  searchParams?: Promise<{ status?: string }>
}

const channels = ['dashboard', 'email', 'slack', 'telegram', 'whatsapp', 'push']

function feedback(status?: string): string | null {
  const messages: Record<string, string> = {
    invalid: 'Regla invalida.',
    saved: 'Regla actualizada.',
    test_sent: 'Notificacion de prueba enviada.',
  }
  return status ? (messages[status] ?? null) : null
}

export default async function NotificationSettingsPage({
  searchParams,
}: NotificationSettingsPageProps) {
  const [{ access, user }, params, rules] = await Promise.all([
    requirePermission('settings.read'),
    searchParams,
    getNotificationRules(),
  ])
  const overview = await getNotificationSettingsOverview(user.id)
  const csrfToken = await createCsrfToken()
  const canManage = access.permissions.includes('settings.manage')
  const message = feedback(params?.status)

  return (
    <main className="px-6 py-8 lg:px-10">
      <PageHeader
        eyebrow="Sistema"
        title="Reglas y canales"
        description="Controla que eventos notifican, por donde salen y como se deduplican."
      />

      {message && (
        <section className="mt-6 rounded-lg border border-[var(--line)] bg-white p-4 text-sm shadow-sm">
          {message}
        </section>
      )}

      <section className="mt-8 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Motor"
          value={overview.enabled ? 'Activo' : 'Inactivo'}
          helper="NOTIFICATIONS_ENABLED"
        />
        <StatCard
          label="Email"
          value={overview.channels.email ? 'Listo' : 'Pendiente'}
          helper="Resend + destinatarios"
        />
        <StatCard
          label="Slack"
          value={overview.channels.slack ? 'Listo' : 'Pendiente'}
          helper="Incoming webhook"
        />
        <StatCard
          label="Telegram"
          value={overview.channels.telegram ? 'Listo' : 'Pendiente'}
          helper="Bot token + chat"
        />
        <StatCard
          label="WhatsApp"
          value={overview.channels.whatsapp ? 'Listo' : 'Pendiente'}
          helper="Template aprobado"
        />
        <StatCard
          label="Push"
          value={String(overview.userPushSubscriptions)}
          helper="Suscripciones activas"
        />
      </section>

      <section className="mt-8 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Web Push</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Activa este navegador para recibir alertas del dashboard.
        </p>
        <div className="mt-4">
          <PushSubscriptionManager csrfToken={csrfToken} publicKey={overview.pushPublicKey} />
        </div>
      </section>

      {canManage && (
        <section className="mt-8 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Enviar prueba</h2>
          <form
            action={sendTestNotificationAction}
            className="mt-4 flex flex-wrap items-center gap-4"
          >
            <CsrfField />
            {channels.map((channel) => (
              <label className="flex items-center gap-2 text-sm" key={channel}>
                <input
                  defaultChecked={overview.defaultChannels.includes(channel as never)}
                  name="channels"
                  type="checkbox"
                  value={channel}
                />
                {channelLabel(channel)}
              </label>
            ))}
            <button className="h-10 rounded-md bg-[var(--ink)] px-4 text-sm font-semibold text-white">
              Enviar prueba
            </button>
          </form>
        </section>
      )}

      <section className="mt-8 rounded-lg border border-[var(--line)] bg-white shadow-sm">
        <div className="border-b border-[var(--line)] px-5 py-4">
          <h2 className="text-lg font-semibold">Reglas</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Define canales y ventana de dedupe por tipo de evento.
          </p>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {rules.map((rule) => (
            <form
              action={updateNotificationRuleAction}
              className="grid gap-4 p-5 xl:grid-cols-[1fr_2fr_auto]"
              key={rule.id}
            >
              <CsrfField />
              <input name="eventType" type="hidden" value={rule.eventType} />
              <div>
                <p className="font-semibold">{rule.label}</p>
                <p className="mt-1 font-mono text-xs text-[var(--muted)]">{rule.eventType}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Severidad base: {severityLabel(rule.severity)}
                </p>
              </div>
              <div className="grid gap-3">
                <div className="flex flex-wrap gap-4">
                  {channels.map((channel) => (
                    <label className="flex items-center gap-2 text-sm" key={channel}>
                      <input
                        defaultChecked={(rule.channels as string[]).includes(channel)}
                        disabled={!canManage}
                        name="channels"
                        type="checkbox"
                        value={channel}
                      />
                      {channelLabel(channel)}
                    </label>
                  ))}
                </div>
                <label className="grid max-w-xs gap-1 text-xs font-semibold text-[var(--muted)]">
                  Dedupe minutos
                  <input
                    className="h-10 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--ink)]"
                    defaultValue={rule.dedupeMinutes}
                    disabled={!canManage}
                    min={1}
                    name="dedupeMinutes"
                    type="number"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    defaultChecked={rule.enabled}
                    disabled={!canManage}
                    name="enabled"
                    type="checkbox"
                  />
                  Activa
                </label>
              </div>
              {canManage && (
                <button className="h-10 rounded-md bg-[var(--ink)] px-4 text-sm font-semibold text-white xl:self-start">
                  Guardar
                </button>
              )}
            </form>
          ))}
        </div>
      </section>
    </main>
  )
}
