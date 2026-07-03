// @ts-check
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'
import { loadEnv } from 'vite'

// loadEnv porque import.meta.env aún no existe al evaluar la config
const { PUBLIC_SITE_URL, PUBLIC_PAYLOAD_API_URL } = loadEnv(
  process.env.NODE_ENV ?? 'development',
  process.cwd(),
  '',
)

/**
 * Redirecciones 301/302 desde la colección redirects del CMS (FASE 8),
 * editables en /admin sin tocar código. Se leen al evaluar la config — el
 * CMS debe estar arriba para el build, igual que para el resto del
 * contenido; si no responde, el build sigue sin redirecciones y lo avisa.
 * En build estático Astro genera páginas con meta refresh + canonical; con
 * el adaptador del deploy (FASE 13) pasan a ser 301 reales del servidor.
 * @returns {Promise<Record<string, { destination: string, status: 301 | 302 }>>}
 */
async function loadRedirects() {
  const base = (PUBLIC_PAYLOAD_API_URL || 'http://localhost:3000').replace(/\/+$/, '')
  try {
    const response = await fetch(`${base}/api/redirects?limit=500&depth=0`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    /** @type {{ docs: { from: string, to: string, permanent?: boolean | null }[] }} */
    const { docs } = await response.json()
    return Object.fromEntries(
      docs.map((doc) => [doc.from, { destination: doc.to, status: doc.permanent ? 301 : 302 }]),
    )
  } catch (error) {
    console.warn(
      `[astro.config] Redirecciones del CMS no cargadas (${error instanceof Error ? error.message : error}) — ¿está corriendo? (pnpm dev:cms)`,
    )
    return {}
  }
}

const redirects = await loadRedirects()
// Las rutas que redirigen no deben aparecer en el sitemap (formato directorio: /seo/)
const redirectPaths = new Set(Object.keys(redirects).map((from) => `${from.replace(/\/+$/, '')}/`))

// https://astro.build/config
export default defineConfig({
  // Necesario para URLs canónicas y Open Graph absolutas (componente SEO)
  site: PUBLIC_SITE_URL || 'http://localhost:4321',
  redirects,
  integrations: [
    // Genera /sitemap-index.xml en build; fuera: /gracias (noindex) y las
    // páginas puente de las redirecciones
    sitemap({
      filter: (page) => !page.includes('/gracias') && !redirectPaths.has(new URL(page).pathname),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
})
