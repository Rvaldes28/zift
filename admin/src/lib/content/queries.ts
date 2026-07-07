import 'server-only'

import { db, pageSections, pageVersions, pages, seoMetadata } from '@ziftlab/db'
import { and, asc, desc, eq, ilike, isNull, lte, or } from 'drizzle-orm'

import { listMediaAssets } from '@/lib/media/queries'

import { buildPageSnapshot, getLatestPageVersions, type PageSnapshot } from './snapshots'
import type { PageStatus, PageType } from './types'

export async function listPages(input: { q?: string; status?: string; type?: string } = {}) {
  const filters = [isNull(pages.deletedAt)]
  if (input.status) filters.push(eq(pages.status, input.status))
  if (input.type) filters.push(eq(pages.type, input.type))
  if (input.q?.trim()) {
    const query = `%${input.q.trim()}%`
    filters.push(or(ilike(pages.title, query), ilike(pages.slug, query))!)
  }

  return db
    .select({
      archivedAt: pages.archivedAt,
      excerpt: pages.excerpt,
      id: pages.id,
      publishedAt: pages.publishedAt,
      routePath: pages.routePath,
      scheduledAt: pages.scheduledAt,
      slug: pages.slug,
      status: pages.status,
      title: pages.title,
      type: pages.type,
      updatedAt: pages.updatedAt,
    })
    .from(pages)
    .where(and(...filters))
    .orderBy(desc(pages.updatedAt))
}

export async function getPageEditor(pageId: string) {
  const [page] = await db.select().from(pages).where(eq(pages.id, pageId)).limit(1)
  if (!page || page.deletedAt) return null

  const [sections, seo, versions, media] = await Promise.all([
    db
      .select()
      .from(pageSections)
      .where(and(eq(pageSections.pageId, page.id), isNull(pageSections.deletedAt)))
      .orderBy(asc(pageSections.position), asc(pageSections.createdAt)),
    db.query.seoMetadata.findFirst({
      where: and(eq(seoMetadata.entityType, 'page'), eq(seoMetadata.entityId, page.id)),
    }),
    getLatestPageVersions(page.id),
    listMediaAssets(),
  ])

  return { media, page, sections, seo, versions }
}

export async function getPublicPageBySlug(
  slug: string,
  origin?: string,
): Promise<PageSnapshot | null> {
  const now = new Date()
  const [page] = await db
    .select()
    .from(pages)
    .where(
      and(
        eq(pages.slug, slug),
        isNull(pages.deletedAt),
        or(
          eq(pages.status, 'published'),
          and(eq(pages.status, 'scheduled'), lte(pages.scheduledAt, now)),
        ),
      ),
    )
    .limit(1)

  if (!page || !page.publishedVersionId) return null

  const [version] = await db
    .select()
    .from(pageVersions)
    .where(eq(pageVersions.id, page.publishedVersionId))
    .limit(1)

  if (!version) return buildPageSnapshot(page.id, origin)

  const snapshot = version.data as unknown as PageSnapshot
  const pageData = snapshot.page as { status?: PageStatus; scheduledAt?: string | null }
  if (
    pageData.status === 'scheduled' &&
    pageData.scheduledAt &&
    new Date(pageData.scheduledAt) > now
  ) {
    return null
  }

  if (!origin) return snapshot

  return buildPageSnapshot(page.id, origin)
}

export async function listPublicPages(input: { type?: PageType } = {}) {
  const now = new Date()
  const filters = [
    isNull(pages.deletedAt),
    or(
      eq(pages.status, 'published'),
      and(eq(pages.status, 'scheduled'), lte(pages.scheduledAt, now)),
    )!,
  ]
  if (input.type) filters.push(eq(pages.type, input.type))

  return db
    .select({
      excerpt: pages.excerpt,
      routePath: pages.routePath,
      slug: pages.slug,
      title: pages.title,
      type: pages.type,
      updatedAt: pages.updatedAt,
    })
    .from(pages)
    .where(and(...filters))
    .orderBy(asc(pages.routePath))
}
