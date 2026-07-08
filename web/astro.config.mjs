// @ts-check
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'
import { loadEnv } from 'vite'

// loadEnv porque import.meta.env aún no existe al evaluar la config
const {
  INTERNAL_API_URL,
  INTERNAL_CONTENT_API_URL,
  PUBLIC_API_URL,
  PUBLIC_CONTENT_API_URL,
  PUBLIC_SITE_URL,
} = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '')

const internalApiBase = (INTERNAL_API_URL || PUBLIC_API_URL || 'http://app:3000').replace(
  /\/+$/,
  '',
)
const contentBase = (
  INTERNAL_CONTENT_API_URL ||
  INTERNAL_API_URL ||
  PUBLIC_CONTENT_API_URL ||
  PUBLIC_API_URL ||
  'http://app:3000'
).replace(/\/+$/, '')

/**
 * Redirecciones 301/302 desde la API propia, editables en /admin sin tocar
 * código. Si no responde, el build sigue sin redirecciones y lo avisa.
 * En build estático Astro genera páginas con meta refresh + canonical; con
 * el adaptador del deploy (FASE 13) pasan a ser 301 reales del servidor.
 * @returns {Promise<Record<string, { destination: string, status: 301 | 302 }>>}
 */
async function loadRedirects() {
  try {
    const response = await fetch(`${contentBase}/api/redirects?limit=500&depth=0`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    /** @type {{ docs: { from?: string, fromPath?: string, to?: string, toPath?: string, permanent?: boolean | null, statusCode?: number | null }[] }} */
    const { docs } = await response.json()
    return Object.fromEntries(
      docs
        .map((doc) => ({
          from: doc.from ?? doc.fromPath,
          status: doc.statusCode === 302 || doc.permanent === false ? 302 : 301,
          to: doc.to ?? doc.toPath,
        }))
        .filter((doc) => doc.from && doc.to)
        .map((doc) => [doc.from, { destination: doc.to, status: doc.status }]),
    )
  } catch (error) {
    console.warn(
      `[astro.config] Redirecciones no cargadas (${error instanceof Error ? error.message : error}) — ¿está corriendo el admin?`,
    )
    return {}
  }
}

async function loadSeoRoutes() {
  try {
    const response = await fetch(`${contentBase}/api/public/seo/routes`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    /** @type {{ docs: { path: string, noindex?: boolean, sitemapInclude?: boolean }[] }} */
    const { docs } = await response.json()
    return docs
  } catch (error) {
    console.warn(
      `[astro.config] Rutas SEO no cargadas (${error instanceof Error ? error.message : error}) — sitemap usara fallback estatico`,
    )
    return []
  }
}

const redirects = await loadRedirects()
const seoRoutes = await loadSeoRoutes()
// Las rutas que redirigen no deben aparecer en el sitemap (formato directorio: /seo/)
const redirectPaths = new Set(Object.keys(redirects).map((from) => `${from.replace(/\/+$/, '')}/`))
const seoExcludedPaths = new Set(
  seoRoutes
    .filter((route) => route.noindex || route.sitemapInclude === false)
    .map((route) => `${route.path.replace(/\/+$/, '')}/`),
)

// https://astro.build/config
export default defineConfig({
  // Necesario para URLs canónicas y Open Graph absolutas (componente SEO)
  site: PUBLIC_SITE_URL || 'http://app:4321',
  redirects,
  integrations: [
    // Genera /sitemap-index.xml en build; fuera: /gracias (noindex) y las
    // páginas puente de las redirecciones
    sitemap({
      filter: (page) => {
        const pathname = new URL(page).pathname
        return (
          !page.includes('/gracias') &&
          !redirectPaths.has(pathname) &&
          !seoExcludedPaths.has(pathname)
        )
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    server: {
      proxy: {
        '/api': {
          changeOrigin: true,
          target: internalApiBase,
        },
      },
    },
  },
})
