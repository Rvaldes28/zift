/**
 * Puente de eventos con GA4: FASE 7 encolaba en dataLayer; FASE 12 conecta
 * gtag.js (Analytics.astro). track() usa el formato de gtag (objeto
 * `arguments`): lo emitido antes de que cargue el script queda encolado y se
 * procesa al cargar; si el usuario no consiente, gtag.js nunca carga y la
 * cola es inerte.
 */

export type TrackParams = Record<string, string | number | boolean | undefined>

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[]
    /** Función/stub de Microsoft Clarity (la inyecta Analytics.astro) */
    clarity?: { (...args: unknown[]): void; q?: unknown[] }
  }
}

export function track(event: string, params: TrackParams = {}): void {
  window.dataLayer ??= []
  // gtag.js exige `arguments` — los objetos planos son sintaxis de GTM y los ignora
  function gtag(..._args: unknown[]) {
    window.dataLayer!.push(arguments as unknown as Record<string, unknown>)
  }
  gtag('event', event, params)
}
