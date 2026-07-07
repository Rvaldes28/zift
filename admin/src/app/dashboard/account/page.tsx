import { PageHeader } from '@/components/dashboard/ui'
import { CsrfField } from '@/components/security/csrf-field'
import { changePassword, disableOwnTotp, startTotpSetup } from '@/lib/auth/actions'
import { authConfig } from '@/lib/auth/config'
import { requirePermission } from '@/lib/rbac/access'
import { revokeOwnSession } from '@/lib/security/actions'
import { createCsrfToken } from '@/lib/security/csrf'
import { listSessionsForUser } from '@/lib/security/queries'
import { createTotpQrDataUrl, decryptTotpSecret } from '@/lib/totp/totp'

import { TotpSetupForm } from './totp-setup-form'

interface AccountPageProps {
  searchParams?: Promise<{
    error?: string
    required?: string
    status?: string
  }>
}

function dateLabel(value: Date): string {
  return value.toLocaleString('es-PA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const params = await searchParams
  const { session, user } = await requirePermission('dashboard.access')
  const config = authConfig()
  const csrfToken = await createCsrfToken()
  const sessions = await listSessionsForUser(user.id, session.id)
  let pendingTotpQr: string | null = null

  if (user.twoFactorSecretEncrypted && !user.twoFactorEnabled) {
    try {
      pendingTotpQr = await createTotpQrDataUrl(
        user.email,
        decryptTotpSecret(user.twoFactorSecretEncrypted),
      )
    } catch {
      pendingTotpQr = null
    }
  }

  return (
    <main className="px-6 py-8 lg:px-10">
      <PageHeader
        eyebrow="Cuenta"
        title="Seguridad de acceso"
        description={
          <>
            Sesion activa como <span className="font-semibold text-[var(--ink)]">{user.email}</span>
            .
          </>
        }
      />
      {params?.required === 'password' && (
        <p className="mt-6 max-w-3xl rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Debes cambiar tu contrasena temporal antes de continuar.
        </p>
      )}
      {params?.required === '2fa' && (
        <p className="mt-6 max-w-3xl rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Tu rol requiere 2FA antes de continuar usando modulos sensibles.
        </p>
      )}

      <section className="mt-8 max-w-xl rounded-lg border border-[var(--line)] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Cambiar contrasena</h2>
        <form action={changePassword} className="mt-6 grid gap-4">
          <CsrfField />
          <label className="grid gap-2 text-sm font-medium">
            Contrasena actual
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              className="h-11 rounded-md border border-[var(--line)] px-3 outline-none transition focus:border-[var(--zift)]"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Nueva contrasena
            <input
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={config.passwordMinLength}
              className="h-11 rounded-md border border-[var(--line)] px-3 outline-none transition focus:border-[var(--zift)]"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Confirmar nueva contrasena
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={config.passwordMinLength}
              className="h-11 rounded-md border border-[var(--line)] px-3 outline-none transition focus:border-[var(--zift)]"
              required
            />
          </label>
          {params?.error === 'invalid' && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              No se pudo cambiar la contrasena. Revisa los datos e intenta de nuevo.
            </p>
          )}
          {params?.status === 'password-updated' && (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Contrasena actualizada. Las otras sesiones fueron revocadas.
            </p>
          )}
          <button
            type="submit"
            className="h-11 rounded-md bg-[var(--zift)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--zift-dark)]"
          >
            Guardar cambio
          </button>
        </form>
      </section>

      <section className="mt-8 max-w-xl rounded-lg border border-[var(--line)] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Autenticacion de dos factores</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          TOTP es opcional. Usa una app autenticadora compatible para agregar una segunda barrera.
        </p>

        {params?.error === 'totp-config' && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            Falta configurar ADMIN_TOTP_ENCRYPTION_KEY para activar 2FA.
          </p>
        )}
        {params?.status === 'totp-disabled' && (
          <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            2FA fue desactivado.
          </p>
        )}

        {user.twoFactorEnabled ? (
          <form action={disableOwnTotp} className="mt-6 grid gap-4">
            <CsrfField />
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              2FA esta activo en tu cuenta.
            </p>
            <label className="grid gap-2 text-sm font-medium">
              Confirma tu contrasena para desactivar
              <input
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                className="h-11 rounded-md border border-[var(--line)] px-3 outline-none transition focus:border-[var(--zift)]"
                required
              />
            </label>
            <button
              type="submit"
              className="h-11 rounded-md border border-red-200 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50"
            >
              Desactivar 2FA
            </button>
          </form>
        ) : pendingTotpQr ? (
          <div className="mt-6">
            <TotpSetupForm csrfToken={csrfToken} qrDataUrl={pendingTotpQr} />
          </div>
        ) : (
          <form action={startTotpSetup} className="mt-6">
            <CsrfField />
            <button
              type="submit"
              className="h-11 rounded-md bg-[var(--ink)] px-4 text-sm font-semibold text-white transition hover:bg-black"
            >
              Configurar 2FA
            </button>
          </form>
        )}
      </section>

      <section className="mt-8 max-w-4xl rounded-lg border border-[var(--line)] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Sesiones activas</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Cierra sesiones que no reconozcas. La sesion actual queda marcada.
        </p>
        <div className="mt-5 grid gap-3">
          {sessions.map((item) => (
            <article
              key={item.id}
              className="grid gap-3 rounded-md border border-[var(--line)] p-4 md:grid-cols-[1fr_auto]"
            >
              <div>
                <p className="text-sm font-semibold">
                  {item.current ? 'Sesion actual' : 'Sesion remota'} · {item.ipAddress ?? 'IP desconocida'}
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                  Ultima actividad: {dateLabel(item.lastSeenAt)} · Expira: {dateLabel(item.expiresAt)}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">
                  {item.userAgent ?? 'User agent no registrado'}
                </p>
                {item.revokedAt && (
                  <p className="mt-2 text-xs text-red-700">
                    Revocada: {dateLabel(item.revokedAt)} · {item.revocationReason ?? 'sin motivo'}
                  </p>
                )}
              </div>
              {!item.revokedAt && (
                <form action={revokeOwnSession}>
                  <CsrfField />
                  <input type="hidden" name="sessionId" value={item.id} />
                  <button className="h-10 rounded-md border border-red-200 px-3 text-sm font-semibold text-red-700">
                    {item.current ? 'Cerrar esta sesion' : 'Cerrar sesion'}
                  </button>
                </form>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
