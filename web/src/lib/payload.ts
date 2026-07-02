/**
 * Cliente de datos para la REST API de Payload CMS.
 *
 * Los tipos vienen del archivo generado por Payload (cms/src/payload-types.ts)
 * vía el alias `@cms/types` — import type-only, se borra en el build.
 */
import type { Config } from '@cms/types'

export type CollectionSlug = keyof Config['collections']
export type GlobalSlug = keyof Config['globals']

/** Origen del CMS. En build estático el fetch ocurre en tiempo de build. */
export const PAYLOAD_URL = (
  import.meta.env.PUBLIC_PAYLOAD_API_URL ?? 'http://localhost:3000'
).replace(/\/+$/, '')

const TIMEOUT_MS = 10_000

/** Forma paginada estándar que devuelve Payload para colecciones. */
export interface PaginatedDocs<T> {
  docs: T[]
  totalDocs: number
  limit: number
  totalPages: number
  page: number
  pagingCounter: number
  hasPrevPage: boolean
  hasNextPage: boolean
  prevPage: number | null
  nextPage: number | null
}

/** Cláusula `where` de Payload (subset: equals, not_equals, in, contains…). */
export type Where = {
  [key: string]: Where | Where[] | string | number | boolean | (string | number)[] | undefined
}

export interface QueryOptions {
  /** Niveles de relaciones a resolver (default 1: uploads/relaciones directas) */
  depth?: number
  where?: Where
  sort?: string
  limit?: number
  page?: number
}

export class PayloadApiError extends Error {
  readonly status: number
  readonly url: string

  constructor(message: string, status: number, url: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'PayloadApiError'
    this.status = status
    this.url = url
  }
}

/** Serializa params anidados a la notación de brackets que espera Payload:
 *  { where: { slug: { equals: 'seo' } } } → where[slug][equals]=seo */
function appendParams(search: URLSearchParams, value: unknown, prefix: string): void {
  if (value === undefined || value === null) return
  if (Array.isArray(value)) {
    value.forEach((item, i) => appendParams(search, item, `${prefix}[${i}]`))
  } else if (typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      appendParams(search, nested, prefix ? `${prefix}[${key}]` : key)
    }
  } else {
    search.set(prefix, String(value))
  }
}

async function payloadFetch<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const search = new URLSearchParams()
  if (params) appendParams(search, params, '')
  const query = search.size > 0 ? `?${search.toString()}` : ''
  const url = `${PAYLOAD_URL}/api${path}${query}`

  let response: Response
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (cause) {
    throw new PayloadApiError(
      `No se pudo conectar con Payload en ${url}. ¿Está corriendo el CMS? (pnpm dev:cms) y ¿PostgreSQL? (brew services start postgresql@16)`,
      0,
      url,
      { cause },
    )
  }

  if (!response.ok) {
    throw new PayloadApiError(
      `Payload respondió ${response.status} ${response.statusText} para ${url}`,
      response.status,
      url,
    )
  }

  try {
    return (await response.json()) as T
  } catch (cause) {
    throw new PayloadApiError(`Payload devolvió JSON inválido para ${url}`, response.status, url, {
      cause,
    })
  }
}

/** Documentos de una colección (solo publicados para colecciones con drafts). */
export function getCollection<TSlug extends CollectionSlug>(
  slug: TSlug,
  options: QueryOptions = {},
): Promise<PaginatedDocs<Config['collections'][TSlug]>> {
  return payloadFetch(`/${slug}`, { depth: 1, ...options })
}

/** Un documento por slug, o null si no existe (no lanza en 404 lógico). */
export async function getBySlug<TSlug extends CollectionSlug>(
  collection: TSlug,
  slug: string,
  options: Pick<QueryOptions, 'depth'> = {},
): Promise<Config['collections'][TSlug] | null> {
  const result = await getCollection(collection, {
    ...options,
    where: { slug: { equals: slug } },
    limit: 1,
  })
  return result.docs[0] ?? null
}

/** Un global de Payload (header, footer, site-settings, home-page). */
export function getGlobal<TSlug extends GlobalSlug>(
  slug: TSlug,
  options: Pick<QueryOptions, 'depth'> = {},
): Promise<Config['globals'][TSlug]> {
  return payloadFetch(`/globals/${slug}`, { depth: options.depth ?? 1 })
}

/* En build de producción cada página repite los globals del layout; se
   memoizan para no golpear la API una vez por página. En dev no se cachea,
   así los cambios del CMS se ven al recargar. */
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

/**
 * Relaciones hasMany con depth ≥ 1 llegan como (id | doc)[] — devuelve solo
 * los docs poblados, en el orden guardado en el CMS.
 */
export function resolveDocs<T extends object>(rel: (number | T)[] | null | undefined): T[] {
  return (rel ?? []).filter((item): item is T => typeof item === 'object' && item !== null)
}
