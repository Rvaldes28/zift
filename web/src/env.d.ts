/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Origen de la API propia del dashboard, ej. http://localhost:3000 */
  readonly PUBLIC_API_URL?: string
  /** Origen especifico para contenido propio; si no existe usa PUBLIC_API_URL */
  readonly PUBLIC_CONTENT_API_URL?: string
  /** Habilita la captura propia consent-gated hacia el dashboard */
  readonly PUBLIC_ANALYTICS_ENABLED?: string
  /** URL pública del sitio Astro, ej. http://localhost:4321 */
  readonly PUBLIC_SITE_URL?: string
  readonly PUBLIC_GA4_ID?: string
  readonly PUBLIC_CLARITY_ID?: string
  readonly PUBLIC_META_PIXEL_ID?: string
  readonly PUBLIC_HOTJAR_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
