/**
 * Eventos de conversión (FASE 7). Se apilan en window.dataLayer con el
 * formato de GA4: la FASE 12 conecta GA4/Clarity y los consume sin cambios.
 * Mientras no haya tag manager cargado, encolar no tiene coste.
 */

export type TrackParams = Record<string, string | number | boolean | undefined>

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[]
  }
}

export function track(event: string, params: TrackParams = {}): void {
  window.dataLayer ??= []
  window.dataLayer.push({ event, ...params })
}
