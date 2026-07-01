/**
 * Utilidades para media de Payload. Las relaciones upload llegan como
 * `number | Media` según el depth del fetch — estas funciones normalizan eso.
 */
import type { Media } from '@cms/types'

import { PAYLOAD_URL } from './payload'

export type MediaRef = number | Media | null | undefined

/** Devuelve el doc Media si la relación vino poblada (depth ≥ 1), o null. */
export function resolveMedia(media: MediaRef): Media | null {
  return typeof media === 'object' && media !== null ? media : null
}

/**
 * URL absoluta de un media. Payload puede devolver la URL relativa al CMS
 * (/api/media/file/…) — se le antepone el origen del CMS en ese caso.
 */
export function getMediaUrl(media: MediaRef): string | null {
  const url = resolveMedia(media)?.url
  if (!url) return null
  return url.startsWith('/') ? `${PAYLOAD_URL}${url}` : url
}

/** Alt del media (campo requerido en el CMS); '' si la relación no vino poblada. */
export function getMediaAlt(media: MediaRef): string {
  return resolveMedia(media)?.alt ?? ''
}
