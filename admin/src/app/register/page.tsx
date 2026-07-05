import { redirect } from 'next/navigation'

import { registerInitialAdmin } from '@/lib/auth/actions'
import { authConfig } from '@/lib/auth/config'
import { initialRegistrationStatus } from '@/lib/auth/queries'
import { getCurrentSession } from '@/lib/auth/session'

interface RegisterPageProps {
  searchParams?: Promise<{
    error?: string
  }>
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams
  const current = await getCurrentSession()
  if (current) redirect('/dashboard')

  const registration = await initialRegistrationStatus()
  const config = authConfig()

  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <section className="w-full max-w-md rounded-lg border border-[var(--line)] bg-white p-8 shadow-sm">
        <p className="font-mono text-xs tracking-[0.18em] text-[var(--muted)] uppercase">
          Primer admin
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Registro inicial</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Este formulario solo crea el primer usuario administrador y requiere el token bootstrap.
        </p>

        {!registration.available ? (
          <div className="mt-8 rounded-md border border-[var(--line)] bg-[var(--background)] p-4">
            <p className="text-sm leading-6 text-[var(--muted)]">
              {registration.tokenConfigured
                ? 'El registro inicial ya esta cerrado.'
                : 'ADMIN_BOOTSTRAP_TOKEN no esta configurado.'}
            </p>
            <a
              href="/login"
              className="mt-4 inline-flex h-10 items-center rounded-md bg-[var(--ink)] px-4 text-sm font-semibold text-white"
            >
              Ir a login
            </a>
          </div>
        ) : (
          <form action={registerInitialAdmin} className="mt-8 grid gap-4">
            <label className="grid gap-2 text-sm font-medium">
              Nombre
              <input
                name="name"
                type="text"
                autoComplete="name"
                className="h-11 rounded-md border border-[var(--line)] px-3 outline-none transition focus:border-[var(--zift)]"
                required
              />
            </label>
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
                autoComplete="new-password"
                minLength={config.passwordMinLength}
                className="h-11 rounded-md border border-[var(--line)] px-3 outline-none transition focus:border-[var(--zift)]"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Token bootstrap
              <input
                name="token"
                type="password"
                autoComplete="one-time-code"
                className="h-11 rounded-md border border-[var(--line)] px-3 outline-none transition focus:border-[var(--zift)]"
                required
              />
            </label>
            {params?.error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                No se pudo completar el registro inicial.
              </p>
            )}
            <button
              type="submit"
              className="h-11 rounded-md bg-[var(--zift)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--zift-dark)]"
            >
              Crear admin
            </button>
          </form>
        )}
      </section>
    </main>
  )
}
