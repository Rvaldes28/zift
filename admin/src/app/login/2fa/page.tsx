import { redirect } from 'next/navigation'

import { CsrfField } from '@/components/security/csrf-field'
import { verifyTwoFactorLogin } from '@/lib/auth/actions'
import { getTwoFactorChallenge } from '@/lib/totp/challenge'

interface TwoFactorPageProps {
  searchParams?: Promise<{
    error?: string
    next?: string
  }>
}

export default async function TwoFactorPage({ searchParams }: TwoFactorPageProps) {
  const params = await searchParams
  const challenge = await getTwoFactorChallenge()
  if (!challenge) redirect('/login?error=invalid')

  const next = params?.next?.startsWith('/dashboard') ? params.next : '/dashboard'

  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <section className="w-full max-w-md rounded-lg border border-[var(--line)] bg-white p-8 shadow-sm">
        <p className="font-mono text-xs tracking-[0.18em] text-[var(--muted)] uppercase">2FA</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Verifica tu acceso</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Ingresa el codigo de tu app autenticadora o un recovery code.
        </p>

        <form action={verifyTwoFactorLogin} className="mt-8 grid gap-4">
          <CsrfField />
          <input type="hidden" name="next" value={next} />
          <label className="grid gap-2 text-sm font-medium">
            Codigo
            <input
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="h-11 rounded-md border border-[var(--line)] px-3 outline-none transition focus:border-[var(--zift)]"
              required
            />
          </label>
          {params?.error === 'invalid' && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              Codigo invalido o expirado.
            </p>
          )}
          <button
            type="submit"
            className="h-11 rounded-md bg-[var(--zift)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--zift-dark)]"
          >
            Verificar
          </button>
        </form>
      </section>
    </main>
  )
}
