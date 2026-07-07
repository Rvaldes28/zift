'use server'

import { db, mediaAssets } from '@ziftlab/db'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { createPageVersion } from '@/lib/content/snapshots'
import { requirePermission, recordActivity } from '@/lib/rbac/access'
import { verifyCsrf } from '@/lib/security/csrf'

import {
  isAllowedMediaType,
  MAX_MEDIA_SIZE,
  metadataFromFile,
  normalizeFolderPath,
  normalizeTags,
} from './metadata'
import { createStorageKey, uploadMediaObject } from './storage'

type JsonRecord = Record<string, unknown>

const uuidSchema = z.string().uuid()

function formString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function nullableString(value: string): string | null {
  return value.length > 0 ? value : null
}

function mediaRedirect(target: string): never {
  redirect(target)
}

function redirectForUpload(pageId: string, outcome: 'invalid' | 'upload' | 'uploaded'): never {
  if (pageId && uuidSchema.safeParse(pageId).success) {
    const key = outcome === 'uploaded' ? 'status' : 'error'
    mediaRedirect(`/dashboard/pages/${pageId}?tab=sections&${key}=${outcome}`)
  }

  if (outcome === 'uploaded') mediaRedirect('/dashboard/media?status=uploaded')

  mediaRedirect(`/dashboard/media/new?error=${outcome}`)
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {}
}

function replacementHistory(metadata: JsonRecord, previous: JsonRecord): JsonRecord[] {
  const current = Array.isArray(metadata.replacements)
    ? metadata.replacements.filter(
        (item): item is JsonRecord =>
          Boolean(item) && typeof item === 'object' && !Array.isArray(item),
      )
    : []

  return [...current, previous].slice(-20)
}

function revalidateMedia(assetId?: string) {
  revalidatePath('/dashboard/media')
  revalidatePath('/dashboard/pages')
  if (assetId) revalidatePath(`/dashboard/media/${assetId}`)
}

export async function uploadMedia(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('media.manage')
  const file = formData.get('file')
  const alt = formString(formData, 'alt')
  const caption = nullableString(formString(formData, 'caption'))
  const folderPath = normalizeFolderPath(formString(formData, 'folderPath'))
  const tags = normalizeTags(formString(formData, 'tags'))
  const pageId = formString(formData, 'pageId')

  if (!(file instanceof File) || file.size === 0 || !alt) redirectForUpload(pageId, 'invalid')
  if (file.size > MAX_MEDIA_SIZE || !isAllowedMediaType(file.type)) {
    redirectForUpload(pageId, 'upload')
  }

  const body = Buffer.from(await file.arrayBuffer())
  const metadata = metadataFromFile(body, file.type)
  const key = createStorageKey(file.name)
  const uploaded = await uploadMediaObject({ body, contentType: file.type, key })

  const [asset] = await db
    .insert(mediaAssets)
    .values({
      alt,
      bucket: uploaded.bucket,
      caption,
      checksum: metadata.checksum,
      createdBy: current.user.id,
      filename: file.name,
      filesize: file.size,
      folderPath,
      height: metadata.dimensions.height,
      metadata: {
        kind: metadata.kind,
        originalName: file.name,
        source: 'admin',
        storageEtag: uploaded.etag ?? null,
      },
      mimeType: file.type,
      status: 'active',
      storageKey: key,
      tags,
      updatedBy: current.user.id,
      url: uploaded.url,
      width: metadata.dimensions.width,
    })
    .returning({ id: mediaAssets.id })

  await recordActivity({
    action: 'media.uploaded',
    actorId: current.user.id,
    entityId: asset.id,
    entityType: 'media',
    metadata: { filename: file.name, folderPath, pageId: pageId || null, tags },
  })

  revalidateMedia(asset.id)

  if (pageId && uuidSchema.safeParse(pageId).success) {
    await createPageVersion({ actorId: current.user.id, pageId })
    redirectForUpload(pageId, 'uploaded')
  }

  redirect(`/dashboard/media/${asset.id}?status=uploaded`)
}

export async function updateMediaMetadata(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('media.manage')
  const assetId = formString(formData, 'assetId')
  if (!uuidSchema.safeParse(assetId).success) redirect('/dashboard/media?error=invalid')

  const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, assetId)).limit(1)
  if (!asset || asset.deletedAt) redirect('/dashboard/media?error=not-found')

  const alt = formString(formData, 'alt')
  if (!alt) redirect(`/dashboard/media/${assetId}?error=invalid`)

  const caption = nullableString(formString(formData, 'caption'))
  const folderPath = normalizeFolderPath(formString(formData, 'folderPath'))
  const tags = normalizeTags(formString(formData, 'tags'))

  await db
    .update(mediaAssets)
    .set({
      alt,
      caption,
      folderPath,
      tags,
      updatedAt: new Date(),
      updatedBy: current.user.id,
    })
    .where(eq(mediaAssets.id, assetId))

  await recordActivity({
    action: 'media.metadata_updated',
    actorId: current.user.id,
    entityId: assetId,
    entityType: 'media',
    metadata: { folderPath, tags },
  })

  revalidateMedia(assetId)
  redirect(`/dashboard/media/${assetId}?status=updated`)
}

export async function replaceMediaFile(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('media.manage')
  const assetId = formString(formData, 'assetId')
  if (!uuidSchema.safeParse(assetId).success) redirect('/dashboard/media?error=invalid')

  const file = formData.get('file')
  const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, assetId)).limit(1)
  if (!asset || asset.deletedAt) redirect('/dashboard/media?error=not-found')
  if (!(file instanceof File) || file.size === 0)
    redirect(`/dashboard/media/${assetId}?error=invalid`)
  if (file.size > MAX_MEDIA_SIZE || !isAllowedMediaType(file.type)) {
    redirect(`/dashboard/media/${assetId}?error=upload`)
  }

  const alt = formString(formData, 'alt') || asset.alt
  const caption = nullableString(formString(formData, 'caption')) ?? asset.caption
  const folderPath = normalizeFolderPath(formString(formData, 'folderPath') || asset.folderPath)
  const tags = normalizeTags(formString(formData, 'tags') || asset.tags.join(', '))
  const body = Buffer.from(await file.arrayBuffer())
  const metadata = metadataFromFile(body, file.type)
  const key = createStorageKey(file.name)
  const uploaded = await uploadMediaObject({ body, contentType: file.type, key })
  const existingMetadata = asRecord(asset.metadata)
  const previous = {
    bucket: asset.bucket,
    checksum: asset.checksum,
    filename: asset.filename,
    filesize: asset.filesize,
    height: asset.height,
    mimeType: asset.mimeType,
    replacedAt: new Date().toISOString(),
    storageKey: asset.storageKey,
    url: asset.url,
    width: asset.width,
  }

  await db
    .update(mediaAssets)
    .set({
      alt,
      bucket: uploaded.bucket,
      caption,
      checksum: metadata.checksum,
      filename: file.name,
      filesize: file.size,
      folderPath,
      height: metadata.dimensions.height,
      metadata: {
        ...existingMetadata,
        kind: metadata.kind,
        replacements: replacementHistory(existingMetadata, previous),
        storageEtag: uploaded.etag ?? null,
      },
      mimeType: file.type,
      replacedAt: new Date(),
      replacedById: current.user.id,
      status: 'active',
      storageKey: key,
      tags,
      updatedAt: new Date(),
      updatedBy: current.user.id,
      url: uploaded.url,
      width: metadata.dimensions.width,
    })
    .where(eq(mediaAssets.id, assetId))

  await recordActivity({
    action: 'media.replaced',
    actorId: current.user.id,
    entityId: assetId,
    entityType: 'media',
    metadata: { filename: file.name, previousStorageKey: asset.storageKey },
  })

  revalidateMedia(assetId)
  redirect(`/dashboard/media/${assetId}?status=replaced`)
}

export async function deleteMedia(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('media.manage')
  const assetId = formString(formData, 'assetId')
  if (!uuidSchema.safeParse(assetId).success) redirect('/dashboard/media?error=invalid')

  const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, assetId)).limit(1)
  if (!asset || asset.deletedAt) redirect('/dashboard/media?error=not-found')

  const reason = nullableString(formString(formData, 'reason'))

  await db
    .update(mediaAssets)
    .set({
      deletedAt: new Date(),
      deletedBy: current.user.id,
      deletedReason: reason,
      status: 'deleted',
      updatedAt: new Date(),
      updatedBy: current.user.id,
    })
    .where(eq(mediaAssets.id, assetId))

  await recordActivity({
    action: 'media.deleted',
    actorId: current.user.id,
    entityId: assetId,
    entityType: 'media',
    metadata: { filename: asset.filename, reason },
  })

  revalidateMedia(assetId)
  redirect('/dashboard/media?status=deleted')
}
