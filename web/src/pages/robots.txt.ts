/**
 * robots.txt (FASE 8). Endpoint en vez de archivo estático para que la URL
 * del sitemap sea absoluta con el site real (PUBLIC_SITE_URL) en cada entorno.
 * /gracias además lleva noindex (FASE 7); aquí se evita hasta el rastreo.
 */
import type { APIRoute } from 'astro'

const CONTENT_API_URL = (
  import.meta.env.PUBLIC_CONTENT_API_URL ??
  import.meta.env.PUBLIC_API_URL ??
  'http://localhost:3000'
).replace(/\/+$/, '')

export const GET: APIRoute = async ({ site }) => {
  const publicSite = site ?? new URL('http://localhost:4321')

  try {
    const response = await fetch(
      `${CONTENT_API_URL}/api/public/seo/robots?site=${encodeURIComponent(publicSite.href)}`,
      { headers: { Accept: 'text/plain' }, signal: AbortSignal.timeout(3000) },
    )
    if (response.ok) {
      return new Response(await response.text(), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }
  } catch {
    // Fallback estatico si la API propia no esta disponible durante build/dev.
  }

  const sitemap = new URL('/sitemap-index.xml', publicSite).href
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /gracias',
    '',
    `Sitemap: ${sitemap}`,
    '',
  ].join('\n')
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
