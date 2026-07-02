/**
 * Consentimiento de cookies (FASE 16). Única fuente de escritura del estado:
 * localStorage `ziftlab-consent` + Google Consent Mode v2 vía dataLayer.
 * El bloqueo previo lo garantiza el script inline de BaseLayout, que fija
 * `consent default: denied` de forma síncrona antes de cualquier script de
 * analítica (GA4/Clarity llegan en FASE 12 y respetan este estado sin cambios).
 */

export const CONSENT_KEY = 'ziftlab-consent'
export const CONSENT_EVENT = 'zift:consent'

export interface ConsentCategories {
  /** GA4, Clarity — medición de uso */
  analytics: boolean
  /** Píxeles y remarketing — hoy sin uso, previsto para campañas */
  marketing: boolean
}

export interface StoredConsent extends ConsentCategories {
  v: 1
  date: string
}

/** Consentimiento guardado, o null si el usuario aún no ha decidido. */
export function readConsent(): StoredConsent | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredConsent
    return parsed.v === 1 ? parsed : null
  } catch {
    return null
  }
}

/** Persiste la decisión, actualiza Consent Mode y avisa al resto de la página. */
export function saveConsent(categories: ConsentCategories): StoredConsent {
  const consent: StoredConsent = { v: 1, date: new Date().toISOString(), ...categories }
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent))
  } catch {
    // Storage bloqueado (p. ej. Safari privado): la sesión sigue con denied
  }
  pushConsentUpdate(categories)
  window.dispatchEvent(new CustomEvent<StoredConsent>(CONSENT_EVENT, { detail: consent }))
  return consent
}

function pushConsentUpdate({ analytics, marketing }: ConsentCategories): void {
  window.dataLayer ??= []
  // Consent Mode exige el objeto `arguments` (gtag.js ignora arrays normales)
  function gtag(..._args: unknown[]) {
    window.dataLayer!.push(arguments as unknown as Record<string, unknown>)
  }
  gtag('consent', 'update', {
    analytics_storage: analytics ? 'granted' : 'denied',
    ad_storage: marketing ? 'granted' : 'denied',
    ad_user_data: marketing ? 'granted' : 'denied',
    ad_personalization: marketing ? 'granted' : 'denied',
  })
}
