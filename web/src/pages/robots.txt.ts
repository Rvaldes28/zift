/**
 * robots.txt (FASE 8). Endpoint en vez de archivo estático para que la URL
 * del sitemap sea absoluta con el site real (PUBLIC_SITE_URL) en cada entorno.
 * /gracias además lleva noindex (FASE 7); aquí se evita hasta el rastreo.
 */
import type { APIRoute } from 'astro'

export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL('/sitemap-index.xml', site ?? 'http://localhost:4321').href
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
