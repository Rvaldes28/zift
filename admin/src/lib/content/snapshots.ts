import 'server-only'

import { db, mediaAssets, pageSections, pageVersions, pages, seoMetadata } from '@ziftlab/db'
import { and, asc, desc, eq, isNull, max } from 'drizzle-orm'

import type { JsonRecord } from './types'

export interface PageSnapshot {
  media: Record<string, PublicMediaAsset>
  page: JsonRecord
  sections: JsonRecord[]
  seo: JsonRecord | null
}

export interface PublicMediaAsset {
  alt: string
  caption: string | null
  filename: string
  filesize: number | null
  height: number | null
  id: string
  mimeType: string | null
  url: string
  width: number | null
}

function collectMediaIds(value: unknown, ids = new Set<string>()): Set<string> {
  if (!value) return ids
  if (typeof value === 'string') return ids

  if (Array.isArray(value)) {
    for (const item of value) collectMediaIds(item, ids)
    return ids
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    for (const [key, nested] of Object.entries(record)) {
      if ((key === 'imageId' || key === 'ogImageId') && typeof nested === 'string') ids.add(nested)
      else collectMediaIds(nested, ids)
    }
  }

  return ids
}

function absolutizeMediaUrl(asset: typeof mediaAssets.$inferSelect, origin?: string): string {
  if (!origin || !asset.url.startsWith('/')) return asset.url

  return new URL(asset.url, origin).href
}

async function mediaMapForSnapshot(snapshot: Omit<PageSnapshot, 'media'>, origin?: string) {
  const ids = collectMediaIds(snapshot.page)
  collectMediaIds(snapshot.seo, ids)
  collectMediaIds(snapshot.sections, ids)

  if (ids.size === 0) return {}

  const rows = await db.select().from(mediaAssets)
  const result: Record<string, PublicMediaAsset> = {}

  for (const asset of rows) {
    if (!ids.has(asset.id) || asset.deletedAt || asset.status !== 'active') continue

    result[asset.id] = {
      alt: asset.alt,
      caption: asset.caption,
      filename: asset.filename,
      filesize: asset.filesize,
      height: asset.height,
      id: asset.id,
      mimeType: asset.mimeType,
      url: absolutizeMediaUrl(asset, origin),
      width: asset.width,
    }
  }

  return result
}

export async function buildPageSnapshot(pageId: string, origin?: string): Promise<PageSnapshot> {
  const [page] = await db.select().from(pages).where(eq(pages.id, pageId)).limit(1)
  if (!page) throw new Error(`Page ${pageId} not found`)

  const [sections, seo] = await Promise.all([
    db
      .select()
      .from(pageSections)
      .where(and(eq(pageSections.pageId, pageId), isNull(pageSections.deletedAt)))
      .orderBy(asc(pageSections.position), asc(pageSections.createdAt)),
    db.query.seoMetadata.findFirst({
      where: and(eq(seoMetadata.entityType, 'page'), eq(seoMetadata.entityId, pageId)),
    }),
  ])

  const snapshotWithoutMedia = {
    page: {
      archivedAt: page.archivedAt?.toISOString() ?? null,
      content: page.content,
      excerpt: page.excerpt,
      id: page.id,
      publishedAt: page.publishedAt?.toISOString() ?? null,
      routePath: page.routePath,
      scheduledAt: page.scheduledAt?.toISOString() ?? null,
      slug: page.slug,
      status: page.status,
      title: page.title,
      type: page.type,
      updatedAt: page.updatedAt.toISOString(),
    },
    sections: sections.map((section) => ({
      data: section.data,
      enabled: section.enabled,
      id: section.id,
      kind: section.kind,
      label: section.label,
      position: section.position,
      settings: section.settings,
    })),
    seo: seo
      ? {
          canonicalUrl: seo.canonicalUrl,
          description: seo.description,
          imageId: seo.imageId,
          noindex: seo.noindex,
          ogDescription: seo.ogDescription,
          ogImageId: seo.ogImageId,
          ogTitle: seo.ogTitle,
          robotsDirectives: seo.robotsDirectives,
          schemaJsonLd: seo.schemaJsonLd,
          sitemapInclude: seo.sitemapInclude,
          title: seo.title,
        }
      : null,
  }

  return {
    ...snapshotWithoutMedia,
    media: await mediaMapForSnapshot(snapshotWithoutMedia, origin),
  }
}

export async function createPageVersion(input: {
  actorId: string
  pageId: string
  origin?: string
}) {
  const [{ value: lastVersion }] = await db
    .select({ value: max(pageVersions.version) })
    .from(pageVersions)
    .where(eq(pageVersions.pageId, input.pageId))

  const version = Number(lastVersion ?? 0) + 1
  const snapshot = await buildPageSnapshot(input.pageId, input.origin)
  const [created] = await db
    .insert(pageVersions)
    .values({
      createdBy: input.actorId,
      data: snapshot as unknown as JsonRecord,
      pageId: input.pageId,
      version,
    })
    .returning({ id: pageVersions.id, version: pageVersions.version })

  await db
    .update(pages)
    .set({ currentVersionId: created.id, updatedAt: new Date() })
    .where(eq(pages.id, input.pageId))

  return created
}

export async function getLatestPageVersions(pageId: string, limit = 20) {
  return db
    .select()
    .from(pageVersions)
    .where(eq(pageVersions.pageId, pageId))
    .orderBy(desc(pageVersions.version))
    .limit(limit)
}
