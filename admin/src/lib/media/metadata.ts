import 'server-only'

import { createHash } from 'crypto'
import { imageSize } from 'image-size'

export const MAX_MEDIA_SIZE = 12 * 1024 * 1024

export const ALLOWED_MEDIA_TYPES = [
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/webp',
  'application/pdf',
] as const

const allowedMediaTypeSet = new Set<string>(ALLOWED_MEDIA_TYPES)

export function isAllowedMediaType(mimeType: string): boolean {
  return allowedMediaTypeSet.has(mimeType)
}

export function isImageMimeType(mimeType: string | null | undefined): boolean {
  return Boolean(mimeType?.startsWith('image/'))
}

export function mediaKindForMimeType(
  mimeType: string | null | undefined,
): 'image' | 'pdf' | 'file' {
  if (isImageMimeType(mimeType)) return 'image'
  if (mimeType === 'application/pdf') return 'pdf'

  return 'file'
}

export function checksumBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

export function readImageDimensions(
  buffer: Buffer,
  mimeType: string,
): { height: number | null; width: number | null } {
  if (!isImageMimeType(mimeType)) return { height: null, width: null }

  try {
    const dimensions = imageSize(buffer)

    return {
      height: typeof dimensions.height === 'number' ? dimensions.height : null,
      width: typeof dimensions.width === 'number' ? dimensions.width : null,
    }
  } catch {
    return { height: null, width: null }
  }
}

function folderSegment(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

export function normalizeFolderPath(value: string): string {
  const segments = value
    .replace(/\\/g, '/')
    .split('/')
    .map((segment) => folderSegment(segment.trim()))
    .filter(Boolean)

  if (segments.length === 0) return '/'

  return `/${segments.join('/')}`
}

export function normalizeTags(value: string): string[] {
  const tags = value
    .split(/[\n,]/g)
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .map((tag) => tag.replace(/\s+/g, ' ').slice(0, 40))

  return [...new Set(tags)].slice(0, 20)
}

export function metadataFromFile(buffer: Buffer, mimeType: string) {
  return {
    checksum: checksumBuffer(buffer),
    dimensions: readImageDimensions(buffer, mimeType),
    kind: mediaKindForMimeType(mimeType),
  }
}
