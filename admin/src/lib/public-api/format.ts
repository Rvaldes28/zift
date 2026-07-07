import 'server-only'

import type { Media, PaginatedDocs } from '@ziftlab/types'

export function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null
}

export function normalizePublicPath(path: string | null | undefined): string {
  const value = (path ?? '').trim()
  if (!value || value === '/') return '/'
  return `/${value.replace(/^\/+|\/+$/g, '')}`
}

export function normalizeSlug(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/^\/+|\/+$/g, '')
}

export function paginate<T>(docs: T[], input: { limit?: number; page?: number }): PaginatedDocs<T> {
  const limit = Math.max(1, Math.min(Number(input.limit || 10), 500))
  const page = Math.max(1, Number(input.page || 1))
  const totalDocs = docs.length
  const totalPages = Math.max(1, Math.ceil(totalDocs / limit))
  const start = (page - 1) * limit
  const pageDocs = docs.slice(start, start + limit)

  return {
    docs: pageDocs,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    limit,
    nextPage: page < totalPages ? page + 1 : null,
    page,
    pagingCounter: totalDocs === 0 ? 0 : start + 1,
    prevPage: page > 1 ? page - 1 : null,
    totalDocs,
    totalPages,
  }
}

export function sortDocs<T extends Record<string, unknown>>(docs: T[], sort?: string | null): T[] {
  if (!sort) return docs

  const direction = sort.startsWith('-') ? -1 : 1
  const key = sort.replace(/^-/, '')

  return [...docs].sort((a, b) => {
    const left = a[key]
    const right = b[key]
    if (left == null && right == null) return 0
    if (left == null) return 1
    if (right == null) return -1
    return String(left).localeCompare(String(right), 'es', { numeric: true }) * direction
  })
}

export function mediaDoc(asset: {
  alt: string
  caption?: string | null
  filename: string
  filesize?: number | null
  height?: number | null
  id: string
  mimeType?: string | null
  url: string
  width?: number | null
}): Media {
  return {
    alt: asset.alt,
    caption: asset.caption ?? null,
    filename: asset.filename,
    filesize: asset.filesize ?? null,
    height: asset.height ?? null,
    id: asset.id,
    mimeType: asset.mimeType ?? null,
    url: asset.url,
    width: asset.width ?? null,
  }
}

export function emptyPaginated<T>(limit = 10, page = 1): PaginatedDocs<T> {
  return paginate<T>([], { limit, page })
}
