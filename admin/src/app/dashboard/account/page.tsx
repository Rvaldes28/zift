import { changePassword, disableOwnTotp, startTotpSetup } from '@/lib/auth/actions'
import { authConfig } from '@/lib/auth/config'
import { requirePermission } from '@/lib/rbac/access'
import { createTotpQrDataUrl, decryptTotpSecret } from '@/lib/totp/totp'

import { TotpSetupForm } from './totp-setup-form'

interface AccountPageProps {
  searchParams?: Promise<{
    error?: string
    required?: string
    status?: string
  }>
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const params = await searchParams
  const { user } = await requirePermission('dashboard.access')
  const config = authConfig()
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
      <section className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.18em] text-[var(--muted)] uppercase">Cuenta</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">Seguridad de acceso</h1>
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
          Sesion activa como <span className="font-semibold text-[var(--ink)]">{user.email}</span>.
        </p>
        {params?.required === 'password' && (
          <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Debes cambiar tu contrasena temporal antes de continuar.
          </p>
        )}
      </section>

      <section className="mt-8 max-w-xl rounded-lg border border-[var(--line)] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Cambiar contrasena</h2>
        <form action={changePassword} className="mt-6 grid gap-4">
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
            <TotpSetupForm qrDataUrl={pendingTotpQr} />
          </div>
        ) : (
          <form action={startTotpSetup} className="mt-6">
            <button
              type="submit"
              className="h-11 rounded-md bg-[var(--ink)] px-4 text-sm font-semibold text-white transition hover:bg-black"
            >
              Configurar 2FA
            </button>
          </form>
        )}
      </section>
    </main>
  )
}
