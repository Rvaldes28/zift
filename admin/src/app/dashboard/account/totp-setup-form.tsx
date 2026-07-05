'use client'

import { useActionState } from 'react'
import Image from 'next/image'

import { confirmTotpSetup, type TotpSetupState } from '@/lib/auth/actions'

const initialState: TotpSetupState = { ok: false }

export function TotpSetupForm({ qrDataUrl }: { qrDataUrl: string }) {
  const [state, formAction, pending] = useActionState(confirmTotpSetup, initialState)

  if (state.ok && state.recoveryCodes) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-semibold text-emerald-900">2FA activado.</p>
        <p className="mt-2 text-sm text-emerald-800">
          Guarda estos recovery codes ahora. No se volveran a mostrar.
        </p>
        <ul className="mt-4 grid gap-2 font-mono text-sm text-emerald-950 sm:grid-cols-2">
          {state.recoveryCodes.map((code) => (
            <li key={code} className="rounded-md bg-white px-3 py-2">
              {code}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-4">
      <p className="text-sm font-semibold">Escanea el QR y confirma el codigo.</p>
      <Image
        src={qrDataUrl}
        alt="QR para configurar 2FA"
        width={220}
        height={220}
        unoptimized
        className="mt-4 h-[220px] w-[220px] rounded-md bg-white"
      />
      <form action={formAction} className="mt-4 grid gap-3">
        <label className="grid gap-2 text-sm font-medium">
          Codigo de 6 digitos
          <input
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            className="h-11 rounded-md border border-[var(--line)] bg-white px-3 outline-none transition focus:border-[var(--zift)]"
            required
          />
        </label>
        {state.error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            No se pudo confirmar el codigo.
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-md bg-[var(--zift)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--zift-dark)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Verificando...' : 'Activar 2FA'}
        </button>
      </form>
    </div>
  )
}
