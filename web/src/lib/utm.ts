/**
 * Atribución de campañas (FASE 12): captura first-touch por sesión de los
 * parámetros utm_* y los guarda en sessionStorage con claves limpias
 * (source, medium…) — el shape espeja el grupo `utm` de
 * cms/src/leads/schema.ts. Sin gate de consentimiento, con criterio: es
 * first-party, vive solo la sesión y su único fin es atribuir un formulario
 * que el usuario envía voluntariamente (sin tracking cross-sesión).
 */

export const UTM_KEY = 'ziftlab-utm'

const UTM_FIELDS = ['source', 'medium', 'campaign', 'term', 'content'] as const

export type UtmData = Partial<Record<(typeof UTM_FIELDS)[number], string>>

/** Guarda las UTMs de la URL actual; first-touch: no pisa las de la sesión. */
export function captureUtm(): void {
  try {
    if (sessionStorage.getItem(UTM_KEY)) return
    const params = new URLSearchParams(window.location.search)
    const utm: UtmData = {}
    for (const field of UTM_FIELDS) {
      const value = params.get(`utm_${field}`)?.trim()
      if (value) utm[field] = value.slice(0, 200)
    }
    if (Object.keys(utm).length > 0) sessionStorage.setItem(UTM_KEY, JSON.stringify(utm))
  } catch {
    // sessionStorage bloqueado (p. ej. Safari privado): sin atribución
  }
}

/** UTMs de la sesión, o null si el usuario no llegó con campaña. */
export function readUtm(): UtmData | null {
  try {
    const raw = sessionStorage.getItem(UTM_KEY)
    if (!raw) return null
    const utm = JSON.parse(raw) as UtmData
    return Object.keys(utm).length > 0 ? utm : null
  } catch {
    return null
  }
}
