/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Browser-facing API origin. Empty means same origin through the Astro dev proxy. */
  readonly PUBLIC_API_URL?: string
  /** Browser-facing content API origin. Empty means PUBLIC_API_URL/same origin. */
  readonly PUBLIC_CONTENT_API_URL?: string
  /** Container-network API origin used by server-side Astro code. */
  readonly INTERNAL_API_URL?: string
  /** Container-network content API origin used by server-side Astro code. */
  readonly INTERNAL_CONTENT_API_URL?: string
  /** Habilita la captura propia consent-gated hacia el dashboard */
  readonly PUBLIC_ANALYTICS_ENABLED?: string
  /** Public Astro site URL exposed by Codespaces port forwarding. */
  readonly PUBLIC_SITE_URL?: string
  readonly PUBLIC_GA4_ID?: string
  readonly PUBLIC_GTM_CONTAINER_ID?: string
  readonly PUBLIC_CLARITY_ID?: string
  readonly PUBLIC_META_PIXEL_ID?: string
  readonly PUBLIC_HOTJAR_ID?: string
  readonly PUBLIC_GOOGLE_ADS_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
