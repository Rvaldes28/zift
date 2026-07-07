import { z } from 'zod'

export const PAGE_STATUSES = ['draft', 'published', 'scheduled', 'archived'] as const
export const PAGE_TYPES = ['home', 'about', 'contact', 'landing', 'page', 'not_found'] as const
export const SECTION_KINDS = [
  'hero',
  'text',
  'rich_text',
  'image_banner',
  'cta',
  'stats',
  'benefits',
  'process',
  'featured_services',
  'featured_projects',
  'testimonials',
  'clients',
  'faq',
] as const

export type PageStatus = (typeof PAGE_STATUSES)[number]
export type PageType = (typeof PAGE_TYPES)[number]
export type SectionKind = (typeof SECTION_KINDS)[number]

export type JsonRecord = Record<string, unknown>

export const PAGE_STATUS_LABELS: Record<PageStatus, string> = {
  archived: 'Archivada',
  draft: 'Borrador',
  published: 'Publicada',
  scheduled: 'Programada',
}

export const PAGE_TYPE_LABELS: Record<PageType, string> = {
  about: 'Quienes somos',
  contact: 'Contacto',
  home: 'Home',
  landing: 'Landing',
  not_found: '404',
  page: 'Pagina',
}

export const SECTION_KIND_LABELS: Record<SectionKind, string> = {
  benefits: 'Beneficios',
  clients: 'Clientes',
  cta: 'CTA',
  faq: 'FAQ',
  featured_projects: 'Proyectos destacados',
  featured_services: 'Servicios destacados',
  hero: 'Hero',
  image_banner: 'Banner con imagen',
  process: 'Proceso',
  rich_text: 'Texto rico',
  stats: 'Cifras',
  testimonials: 'Testimonios',
  text: 'Texto',
}

export const pageStatusSchema = z.enum(PAGE_STATUSES)
export const pageTypeSchema = z.enum(PAGE_TYPES)
export const sectionKindSchema = z.enum(SECTION_KINDS)

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 220)
}

export function isReservedPageType(
  type: string,
): type is 'home' | 'about' | 'contact' | 'not_found' {
  return type === 'home' || type === 'about' || type === 'contact' || type === 'not_found'
}

export function reservedPageSlug(type: PageType): string | null {
  if (type === 'home') return 'home'
  if (type === 'about') return 'quienes-somos'
  if (type === 'contact') return 'contacto'
  if (type === 'not_found') return '404'

  return null
}

export function routePathForPage(input: { slug: string; type: PageType }): string {
  if (input.type === 'home') return '/'
  if (input.type === 'about') return '/quienes-somos'
  if (input.type === 'contact') return '/contacto'
  if (input.type === 'not_found') return '/404'

  return `/${input.slug.replace(/^\/+/, '')}`
}

export function defaultSectionData(kind: SectionKind): JsonRecord {
  if (kind === 'hero') {
    return {
      eyebrow: '',
      primaryCta: { href: '/contacto', label: 'Hablemos' },
      secondaryCta: { href: '/servicios', label: 'Ver servicios' },
      subtitle: '',
      title: '',
    }
  }

  if (kind === 'cta') {
    return {
      cta: { href: '/contacto', label: 'Contactar' },
      text: '',
      title: '',
    }
  }

  if (kind === 'stats') {
    return { items: [{ label: 'Metric', value: '+1' }] }
  }

  if (kind === 'benefits' || kind === 'process' || kind === 'faq') {
    return { items: [{ text: '', title: '' }], subtitle: '', title: '' }
  }

  if (
    kind === 'featured_services' ||
    kind === 'featured_projects' ||
    kind === 'testimonials' ||
    kind === 'clients'
  ) {
    return { subtitle: '', title: '' }
  }

  if (kind === 'rich_text') return { body: '' }

  return { text: '', title: '' }
}
