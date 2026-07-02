/**
 * RSS del blog (FASE 6): los 20 artículos más recientes, generado en build.
 * Autodescubrible vía <link rel="alternate"> en BaseLayout.
 */
import rss from '@astrojs/rss'
import type { APIContext } from 'astro'

import { blogPageHref, postCategories } from '@/lib/blog'
import { getCachedGlobal, getCollection } from '@/lib/payload'

export async function GET(context: APIContext): Promise<Response> {
  const [settings, posts] = await Promise.all([
    getCachedGlobal('site-settings'),
    getCollection('posts', { sort: '-publishedAt', limit: 20 }),
  ])

  return rss({
    title: `Blog de ${settings.siteName}`,
    description:
      settings.defaultSeo?.description ??
      'Guías prácticas sobre desarrollo web, marketing digital, SEO, e-commerce, automatización e IA.',
    // astro.config define site (PUBLIC_SITE_URL); el fallback cubre el tipado
    site: context.site ?? 'http://localhost:4321',
    items: posts.docs
      .filter((post) => Boolean(post.slug))
      .map((post) => ({
        title: post.title,
        description: post.excerpt,
        link: `/blog/${post.slug}`,
        pubDate: new Date(post.publishedAt ?? post.createdAt),
        categories: postCategories(post).map((category) => category.title),
      })),
    customData: `<language>es</language><link>${new URL(blogPageHref(1), context.site ?? 'http://localhost:4321').href}</link>`,
  })
}
