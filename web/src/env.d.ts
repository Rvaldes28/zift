/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Origen del CMS Payload, ej. http://localhost:3000 */
  readonly PUBLIC_PAYLOAD_API_URL?: string
  /** URL pública del sitio Astro, ej. http://localhost:4321 */
  readonly PUBLIC_SITE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
