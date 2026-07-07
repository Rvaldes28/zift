import { z } from 'zod'

import { slugify } from '@/lib/content/types'

export const SEO_ENTITY_TYPES = ['page', 'service', 'project', 'post'] as const
export type SeoEntityType = (typeof SEO_ENTITY_TYPES)[number]

export const SEO_ENTITY_LABELS: Record<SeoEntityType, string> = {
  page: 'Pagina',
  post: 'Articulo',
  project: 'Proyecto',
  service: 'Servicio',
}

export const SEO_ENTITY_PLURAL_LABELS: Record<SeoEntityType, string> = {
  page: 'Paginas',
  post: 'Blog',
  project: 'Proyectos',
  service: 'Servicios',
}

export const ROBOTS_DIRECTIVES = [
  'index',
  'noindex',
  'follow',
  'nofollow',
  'noarchive',
  'nosnippet',
  'max-snippet:-1',
  'max-image-preview:large',
  'max-video-preview:-1',
] as const

export type RobotsDirective = (typeof ROBOTS_DIRECTIVES)[number]

export const DEFAULT_ROBOTS_DIRECTIVES: RobotsDirective[] = [
  'index',
  'follow',
  'max-image-preview:large',
]

export const entityTypeSchema = z.enum(SEO_ENTITY_TYPES)

export const routePrefixes: Record<SeoEntityType, string> = {
  page: '',
  post: '/blog',
  project: '/portafolio',
  service: '/servicios',
}

export function normalizePath(value: string): string {
  const trimmed = value.trim()
  if (!trimmed || trimmed === '/') return '/'

  return `/${trimmed.replace(/^\/+/, '').replace(/\/+$/, '')}`
}

export function pathForEntity(input: {
  entityType: SeoEntityType
  routePath?: string | null
  slug: string
}): string {
  if (input.entityType === 'page') return normalizePath(input.routePath || `/${input.slug}`)

  return normalizePath(`${routePrefixes[input.entityType]}/${input.slug}`)
}

export function slugFromInput(value: string): string {
  return slugify(value).replace(/^\/+|\/+$/g, '')
}

export function splitRobotsDirectives(value: string): string[] {
  return value
    .split(/[\n,]/g)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
}

export function normalizeRobotsDirectives(input: string[]): string[] {
  const directives = input
    .map((item) => item.trim().toLowerCase())
    .filter((item) => ROBOTS_DIRECTIVES.includes(item as RobotsDirective))

  const withoutContradictions = directives.filter((directive) => {
    if (directive === 'index' && directives.includes('noindex')) return false
    if (directive === 'follow' && directives.includes('nofollow')) return false

    return true
  })

  return [...new Set(withoutContradictions)]
}

export function defaultRobotsForNoindex(noindex: boolean): string[] {
  if (noindex) return ['noindex', 'nofollow']

  return DEFAULT_ROBOTS_DIRECTIVES
}
