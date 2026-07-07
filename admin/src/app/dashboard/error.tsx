'use client'

import { ErrorState } from '@/components/dashboard/ui'

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorState
      message="Hubo un problema renderizando esta seccion del dashboard."
      action={
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-red-800 px-4 py-2 text-sm font-semibold text-white"
        >
          Reintentar
        </button>
      }
    />
  )
}
