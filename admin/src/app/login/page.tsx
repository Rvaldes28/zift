import { redirect } from 'next/navigation'

import { CsrfField } from '@/components/security/csrf-field'
import { login } from '@/lib/auth/actions'
import { initialRegistrationStatus } from '@/lib/auth/queries'
import { getCurrentSession } from '@/lib/auth/session'

interface LoginPageProps {
  searchParams?: Promise<{
    error?: string
    logged_out?: string
    next?: string
    registered?: string
  }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const current = await getCurrentSession()
  if (current) redirect('/dashboard')

  const registration = await initialRegistrationStatus()
  const next = params?.next?.startsWith('/dashboard') ? params.next : '/dashboard'

  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <section className="w-full max-w-md rounded-lg border border-[var(--line)] bg-white p-8 shadow-sm">
        <p className="font-mono text-xs tracking-[0.18em] text-[var(--muted)] uppercase">Admin</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Entrar al dashboard</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Usa tu usuario del dashboard propio. Esta autenticacion no depende de Payload.
        </p>

        <form action={login} className="mt-8 grid gap-4">
          <CsrfField />
          <input type="hidden" name="next" value={next} />
          <label className="grid gap-2 text-sm font-medium">
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              className="h-11 rounded-md border border-[var(--line)] px-3 outline-none transition focus:border-[var(--zift)]"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Contrasena
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              className="h-11 rounded-md border border-[var(--line)] px-3 outline-none transition focus:border-[var(--zift)]"
              required
            />
          </label>
          {params?.error === 'invalid' && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              Credenciales invalidas.
            </p>
          )}
          {params?.error === 'locked' && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              Demasiados intentos. Espera unos minutos antes de volver a probar.
            </p>
          )}
          {params?.error === 'forbidden' && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              Tu usuario no tiene permiso para entrar al dashboard.
            </p>
          )}
          {params?.logged_out === '1' && (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Sesion cerrada.
            </p>
          )}
          {params?.registered === 'closed' && (
            <p className="rounded-md bg-[var(--background)] px-3 py-2 text-sm text-[var(--muted)]">
              El registro inicial ya fue completado.
            </p>
          )}
          <button
            type="submit"
            className="h-11 rounded-md bg-[var(--zift)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--zift-dark)]"
          >
            Entrar
          </button>
        </form>

        {registration.available && (
          <p className="mt-6 text-sm text-[var(--muted)]">
            Primer acceso?{' '}
            <a href="/register" className="font-semibold text-[var(--zift-dark)] hover:underline">
              Crear admin inicial
            </a>
          </p>
        )}
      </section>
    </main>
  )
}
