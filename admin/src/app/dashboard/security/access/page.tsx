import { PageHeader } from '@/components/dashboard/ui'
import { CsrfField } from '@/components/security/csrf-field'
import { requireAnyPermission } from '@/lib/rbac/access'
import { blockIpAddressAction, unblockIpAddressAction } from '@/lib/security/actions'
import { listActiveIpBlocks, listRecentLoginAttempts } from '@/lib/security/queries'

interface SecurityAccessPageProps {
  searchParams?: Promise<{ error?: string; status?: string }>
}

function dateLabel(value: Date): string {
  return value.toLocaleString('es-PA', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export default async function SecurityAccessPage({ searchParams }: SecurityAccessPageProps) {
  const [{ access }, params, attempts, blocks] = await Promise.all([
    requireAnyPermission(['audit.read', 'users.manage', 'settings.manage']),
    searchParams,
    listRecentLoginAttempts(120),
    listActiveIpBlocks(120),
  ])
  const canManage = access.permissions.includes('users.manage') || access.permissions.includes('settings.manage')

  return (
    <main className="px-6 py-8 lg:px-10">
      <PageHeader
        eyebrow="Seguridad"
        title="Accesos e IPs"
        description="Intentos de login/2FA, bloqueos persistentes y respuesta manual ante abuso."
      />

      {params?.status && (
        <p className="mt-6 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Cambio aplicado.
        </p>
      )}
      {params?.error && (
        <p className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          No se pudo aplicar la accion.
        </p>
      )}

      <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Intentos recientes</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--line)] text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
                  <th className="py-3 pr-4">Fecha</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3">Resultado</th>
                  <th className="py-3 pl-4">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {attempts.map((attempt) => (
                  <tr key={attempt.id}>
                    <td className="py-3 pr-4 text-[var(--muted)]">{dateLabel(attempt.attemptedAt)}</td>
                    <td className="px-4 py-3">{attempt.email ?? attempt.userEmail ?? 'Sin email'}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{attempt.ipAddress ?? 'N/A'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          attempt.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {attempt.success ? 'OK' : 'Fallo'}
                      </span>
                    </td>
                    <td className="py-3 pl-4 text-[var(--muted)]">{attempt.reason ?? 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="grid h-fit gap-5">
          {canManage && (
            <form
              action={blockIpAddressAction}
              className="grid gap-4 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm"
            >
              <CsrfField />
              <h2 className="text-lg font-semibold">Bloquear IP</h2>
              <input
                name="ipAddress"
                placeholder="203.0.113.10"
                className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
                required
              />
              <input
                name="reason"
                placeholder="motivo"
                className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
              />
              <button className="h-10 rounded-md bg-[var(--ink)] px-4 text-sm font-semibold text-white">
                Bloquear
              </button>
            </form>
          )}

          <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">IPs bloqueadas</h2>
            <div className="mt-4 grid gap-3">
              {blocks.map((block) => (
                <article key={block.id} className="rounded-md border border-[var(--line)] p-3">
                  <p className="text-sm font-semibold">{block.ipAddress}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    {block.reason} · hasta {dateLabel(block.blockedUntil)}
                  </p>
                  {canManage && (
                    <form action={unblockIpAddressAction} className="mt-3">
                      <CsrfField />
                      <input type="hidden" name="blockId" value={block.id} />
                      <button className="rounded-md border border-[var(--line)] px-3 py-2 text-sm font-semibold">
                        Desbloquear
                      </button>
                    </form>
                  )}
                </article>
              ))}
              {blocks.length === 0 && (
                <p className="text-sm text-[var(--muted)]">No hay bloqueos activos.</p>
              )}
            </div>
          </section>
        </aside>
      </section>
    </main>
  )
}
