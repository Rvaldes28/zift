import type { Media, MediaRef } from '@ziftlab/types'

import { API_URL } from './api'

export function resolveMedia(media: MediaRef): Media | null {
  return typeof media === 'object' && media !== null ? media : null
}

export function getMediaUrl(media: MediaRef): string | null {
  const url = resolveMedia(media)?.url
  if (!url) return null
  return url.startsWith('/') ? `${API_URL}${url}` : url
}

export function getMediaAlt(media: MediaRef): string {
  return resolveMedia(media)?.alt ?? ''
}
