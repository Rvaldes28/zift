import type { CollectionSlug, Config, GlobalSlug, PaginatedDocs } from '@ziftlab/types'

export type { CollectionSlug, GlobalSlug, PaginatedDocs }

export type Where = {
  [key: string]: Where | Where[] | boolean | number | string | (number | string)[] | undefined
}

export interface QueryOptions {
  depth?: number
  limit?: number
  page?: number
  sort?: string
  where?: Where
}

export class PublicApiError extends Error {
  readonly status: number
  readonly url: string

  constructor(message: string, status: number, url: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'PublicApiError'
    this.status = status
    this.url = url
  }
}

export const API_URL = (import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3000').replace(
  /\/+$/,
  '',
)

export const CONTENT_API_URL = (
  import.meta.env.PUBLIC_CONTENT_API_URL ??
  import.meta.env.PUBLIC_API_URL ??
  'http://localhost:3000'
).replace(/\/+$/, '')

const TIMEOUT_MS = 8_000
const warnedFallbacks = new Set<string>()

function appendParams(search: URLSearchParams, value: unknown, prefix: string): void {
  if (value === undefined || value === null) return
  if (Array.isArray(value)) {
    value.forEach((item, index) => appendParams(search, item, `${prefix}[${index}]`))
  } else if (typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      appendParams(search, nested, prefix ? `${prefix}[${key}]` : key)
    }
  } else {
    search.set(prefix, String(value))
  }
}

async function publicFetch<T>(
  path: string,
  params?: Record<string, unknown>,
  options: { baseUrl?: string; previewToken?: string } = {},
): Promise<T> {
  const search = new URLSearchParams()
  if (params) appendParams(search, params, '')
  if (options.previewToken) search.set('token', options.previewToken)
  const query = search.size > 0 ? `?${search.toString()}` : ''
  const url = `${options.baseUrl ?? API_URL}/api${path}${query}`

  let response: Response
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (cause) {
    throw new PublicApiError(`No se pudo conectar con la API publica en ${url}`, 0, url, {
      cause,
    })
  }

  if (!response.ok) {
    throw new PublicApiError(
      `La API publica respondio ${response.status} ${response.statusText} para ${url}`,
      response.status,
      url,
    )
  }

  try {
    return (await response.json()) as T
  } catch (cause) {
    throw new PublicApiError(
      `La API publica devolvio JSON invalido para ${url}`,
      response.status,
      url,
      {
        cause,
      },
    )
  }
}

function emptyPaginated<T>(limit = 10, page = 1): PaginatedDocs<T> {
  return {
    docs: [],
    hasNextPage: false,
    hasPrevPage: false,
    limit,
    nextPage: null,
    page,
    pagingCounter: 0,
    prevPage: null,
    totalDocs: 0,
    totalPages: 1,
  }
}

function warnFallback(error: unknown): void {
  const key =
    error instanceof PublicApiError && error.status === 0
      ? 'offline'
      : error instanceof Error
        ? error.message
        : String(error)

  if (warnedFallbacks.has(key)) return
  warnedFallbacks.add(key)
  console.warn(
    `[web] API publica no disponible; usando fallbacks temporales (${error instanceof Error ? error.message : error})`,
  )
}

function fallbackGlobal<TSlug extends GlobalSlug>(slug: TSlug): Config['globals'][TSlug] {
  if (slug === 'site-settings') {
    return {
      defaultSeo: {
        description: 'Tecnologia que vende',
        ogImage: null,
        title: 'ZiftLab',
      },
      externalScripts: [],
      favicon: null,
      logo: null,
      siteName: 'ZiftLab',
      socialLinks: [],
      tagline: 'Tecnologia que vende',
    } as Config['globals'][TSlug]
  }

  if (slug === 'header') {
    return {
      cta: { href: '/contacto', label: 'Hablemos' },
      logo: null,
      navItems: [
        { href: '/servicios', label: 'Servicios' },
        { href: '/portafolio', label: 'Portafolio' },
        { href: '/blog', label: 'Blog' },
        { href: '/quienes-somos', label: 'Quiénes somos' },
        { href: '/contacto', label: 'Contacto' },
      ],
    } as Config['globals'][TSlug]
  }

  if (slug === 'footer') {
    return {
      bottomText: `© ${new Date().getFullYear()} ZiftLab. Todos los derechos reservados.`,
      columns: [
        {
          links: [
            { href: '/servicios', label: 'Servicios' },
            { href: '/portafolio', label: 'Portafolio' },
            { href: '/blog', label: 'Blog' },
          ],
          title: 'Sitio',
        },
      ],
    } as Config['globals'][TSlug]
  }

  if (slug === 'home-page') {
    return {
      hero: {
        eyebrow: 'ZiftLab',
        primaryCta: { href: '/contacto', label: 'Hablemos' },
        secondaryCta: { href: '/servicios', label: 'Ver servicios' },
        subtitle: 'Creamos sitios, automatizaciones y sistemas digitales para vender mejor.',
        title: 'ZiftLab',
      },
      meta: { description: 'Tecnologia que vende', title: 'ZiftLab' },
    } as Config['globals'][TSlug]
  }

  if (slug === 'about-page') {
    return {
      ctaSection: {
        cta: { href: '/contacto', label: 'Hablemos' },
        text: 'Cuéntanos qué quieres construir y te ayudamos a ordenar el siguiente paso.',
        title: '¿Construimos algo juntos?',
      },
      intro: {
        eyebrow: 'Quiénes somos',
        text: 'Somos un equipo enfocado en convertir tecnología en crecimiento comercial.',
        title: 'Tecnología que vende',
      },
      values: [],
    } as unknown as Config['globals'][TSlug]
  }

  return {
    text: 'Cuéntanos tu proyecto y te respondemos pronto.',
    title: 'Contacto',
  } as Config['globals'][TSlug]
}

export async function getCollection<TSlug extends CollectionSlug>(
  slug: TSlug,
  options: QueryOptions = {},
): Promise<PaginatedDocs<Config['collections'][TSlug]>> {
  try {
    return await publicFetch<PaginatedDocs<Config['collections'][TSlug]>>(`/${slug}`, {
      depth: 1,
      ...options,
    })
  } catch (error) {
    warnFallback(error)
    return emptyPaginated<Config['collections'][TSlug]>(options.limit, options.page)
  }
}

export async function getPreviewCollection<TSlug extends CollectionSlug>(
  slug: TSlug,
  token: string,
  options: QueryOptions = {},
): Promise<PaginatedDocs<Config['collections'][TSlug]>> {
  return publicFetch<PaginatedDocs<Config['collections'][TSlug]>>(
    `/preview/${slug}`,
    { depth: 1, ...options },
    { previewToken: token },
  )
}

export async function getBySlug<TSlug extends CollectionSlug>(
  collection: TSlug,
  slug: string,
  options: Pick<QueryOptions, 'depth'> = {},
): Promise<Config['collections'][TSlug] | null> {
  const result = await getCollection(collection, {
    ...options,
    limit: 1,
    where: { slug: { equals: slug } },
  })
  return result.docs[0] ?? null
}

export async function getGlobal<TSlug extends GlobalSlug>(
  slug: TSlug,
  options: Pick<QueryOptions, 'depth'> = {},
): Promise<Config['globals'][TSlug]> {
  try {
    return await publicFetch<Config['globals'][TSlug]>(`/globals/${slug}`, {
      depth: options.depth ?? 1,
    })
  } catch (error) {
    warnFallback(error)
    return fallbackGlobal(slug)
  }
}

const globalCache = new Map<string, Promise<unknown>>()

export function getCachedGlobal<TSlug extends GlobalSlug>(
  slug: TSlug,
  options: Pick<QueryOptions, 'depth'> = {},
): Promise<Config['globals'][TSlug]> {
  if (!import.meta.env.PROD) return getGlobal(slug, options)

  const key = `${slug}:${options.depth ?? 1}`
  let cached = globalCache.get(key)
  if (!cached) {
    cached = getGlobal(slug, options)
    globalCache.set(key, cached)
  }
  return cached as Promise<Config['globals'][TSlug]>
}

export function resolveDocs<T extends object>(
  rel: (number | string | T)[] | null | undefined,
): T[] {
  return (rel ?? []).filter((item): item is T => typeof item === 'object' && item !== null)
}
