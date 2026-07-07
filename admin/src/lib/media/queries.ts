import 'server-only'

import { db, mediaAssets } from '@ziftlab/db'
import { and, desc, eq, ilike, isNotNull, isNull, or, sql } from 'drizzle-orm'

import { normalizeFolderPath } from './metadata'

export type MediaStatusFilter = 'active' | 'deleted' | 'replaced'
export type MediaTypeFilter = 'image' | 'pdf'

export interface ListMediaAssetsInput {
  folder?: string
  q?: string
  status?: string
  tag?: string
  type?: string
}

function statusFilters(status?: string) {
  if (status === 'deleted')
    return [eq(mediaAssets.status, 'deleted'), isNotNull(mediaAssets.deletedAt)]
  if (status === 'replaced')
    return [eq(mediaAssets.status, 'replaced'), isNull(mediaAssets.deletedAt)]

  return [eq(mediaAssets.status, 'active'), isNull(mediaAssets.deletedAt)]
}

export async function listMediaAssets(input: ListMediaAssetsInput = {}) {
  const filters = statusFilters(input.status)

  if (input.q?.trim()) {
    const query = `%${input.q.trim()}%`
    filters.push(
      or(
        ilike(mediaAssets.filename, query),
        ilike(mediaAssets.alt, query),
        ilike(mediaAssets.caption, query),
      )!,
    )
  }

  if (input.folder?.trim())
    filters.push(eq(mediaAssets.folderPath, normalizeFolderPath(input.folder)))
  if (input.tag?.trim()) {
    filters.push(
      sql`${mediaAssets.tags} @> ${JSON.stringify([input.tag.trim().toLowerCase()])}::jsonb`,
    )
  }
  if (input.type === 'image') filters.push(ilike(mediaAssets.mimeType, 'image/%'))
  if (input.type === 'pdf') filters.push(eq(mediaAssets.mimeType, 'application/pdf'))

  return db
    .select()
    .from(mediaAssets)
    .where(and(...filters))
    .orderBy(desc(mediaAssets.updatedAt), desc(mediaAssets.createdAt))
}

export async function getMediaAssetById(id: string, input: { includeDeleted?: boolean } = {}) {
  const filters = [eq(mediaAssets.id, id)]
  if (!input.includeDeleted) filters.push(isNull(mediaAssets.deletedAt))

  const [asset] = await db
    .select()
    .from(mediaAssets)
    .where(and(...filters))
    .limit(1)

  return asset ?? null
}

export async function getMediaAssetByStorageKey(storageKey: string) {
  return db.query.mediaAssets.findFirst({
    where: and(
      eq(mediaAssets.storageKey, storageKey),
      eq(mediaAssets.status, 'active'),
      isNull(mediaAssets.deletedAt),
    ),
  })
}

export async function getMediaFilterOptions() {
  const rows = await db
    .select({
      folderPath: mediaAssets.folderPath,
      tags: mediaAssets.tags,
    })
    .from(mediaAssets)
    .where(and(eq(mediaAssets.status, 'active'), isNull(mediaAssets.deletedAt)))
    .orderBy(desc(mediaAssets.updatedAt))

  const folders = new Set<string>()
  const tags = new Set<string>()

  for (const row of rows) {
    if (row.folderPath && row.folderPath !== '/') folders.add(row.folderPath)
    for (const tag of row.tags ?? []) tags.add(tag)
  }

  return {
    folders: [...folders].sort(),
    tags: [...tags].sort(),
  }
}
