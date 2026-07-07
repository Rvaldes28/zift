import { getGlobalRobotsRules, listPublicSeoRoutes } from '@/lib/seo/queries'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const origin = url.searchParams.get('site') || url.origin
  const [rules, routes] = await Promise.all([getGlobalRobotsRules(), listPublicSeoRoutes()])
  const disallow = routes
    .filter((route) => route.noindex || route.robotsDirectives.includes('noindex'))
    .map((route) => `Disallow: ${route.path}`)
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /gracias',
    ...disallow,
    ...rules,
    '',
    `Sitemap: ${new URL('/sitemap-index.xml', origin).href}`,
    '',
  ].join('\n')

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
