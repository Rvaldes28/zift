import type { Category, Post, TeamMember } from '@ziftlab/types'

import { resolveDocs } from './api'
import { richTextPlainText } from './rich-text'

/** Posts por página en el listado del blog (grid de 3 columnas × 2 filas). */
export const POSTS_PER_PAGE = 6

/** URL del listado: página 1 vive en /blog, las siguientes en /blog/pagina/N. */
export function blogPageHref(page: number): string {
  return page <= 1 ? '/blog' : `/blog/pagina/${page}`
}

export function lexicalPlainText(content: unknown): string {
  return richTextPlainText(content)
}

/** Minutos de lectura (~200 palabras/min en español), mínimo 1. */
export function readingTimeMinutes(content: unknown): number {
  const words = lexicalPlainText(content).split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

/** "12 de junio de 2026" — para la cabecera del post. */
export function formatDateLong(date: string): string {
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(date),
  )
}

/** "12 jun 2026" — para la línea de registro de las cards. */
export function formatDateShort(date: string): string {
  return new Intl.DateTimeFormat('es', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(new Date(date))
    .replace(/\./g, '')
}

/** Categorías pobladas del post, en el orden guardado por la API. */
export function postCategories(post: Post): Category[] {
  return resolveDocs<Category>(post.categories)
}

/** Autor poblado del post (relación a team-members), o null. */
export function postAuthor(post: Post): TeamMember | null {
  return typeof post.author === 'object' ? post.author : null
}
