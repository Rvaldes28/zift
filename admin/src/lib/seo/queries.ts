import 'server-only'

import {
  db,
  mediaAssets,
  pages,
  posts,
  projects,
  redirects,
  seoMetadata,
  services,
} from '@ziftlab/db'
import { and, asc, desc, eq, ilike, isNull, or } from 'drizzle-orm'

import { pathForEntity, type SeoEntityType } from './types'

export interface SeoEntityListItem {
  canonicalUrl: string | null
  description: string | null
  entityType: SeoEntityType
  id: string
  imageId: string | null
  noindex: boolean
  ogImageId: string | null
  path: string
  scheduledAt: Date | null
  sitemapInclude: boolean
  slug: string
  status: string
  subtype: string | null
  title: string
  updatedAt: Date
}

export interface SeoEntityDetail extends SeoEntityListItem {
  excerpt: string | null
  ogDescription: string | null
  ogTitle: string | null
  robotsDirectives: string[]
  schemaJsonLd: unknown
}

export interface PublicSeoRoute {
  entityId: string
  entityType: SeoEntityType
  noindex: boolean
  path: string
  robotsDirectives: string[]
  sitemapInclude: boolean
  updatedAt: string
}

type SeoRow = typeof seoMetadata.$inferSelect

function applySearch<T extends { slug: unknown; title: unknown }>(
  filters: unknown[],
  table: T,
  query?: string,
) {
  if (!query?.trim()) return

  const like = `%${query.trim()}%`
  filters.push(or(ilike(table.title as never, like), ilike(table.slug as never, like))!)
}

function seoByEntity(rows: SeoRow[]) {
  return new Map(rows.map((row) => [`${row.entityType}:${row.entityId}`, row]))
}

function itemFromEntity(input: {
  entityType: SeoEntityType
  id: string
  routePath?: string | null
  scheduledAt?: Date | null
  seo?: SeoRow | null
  slug: string
  status: string
  subtype?: string | null
  title: string
  updatedAt: Date
}): SeoEntityListItem {
  return {
    canonicalUrl: input.seo?.canonicalUrl ?? null,
    description: input.seo?.description ?? null,
    entityType: input.entityType,
    id: input.id,
    imageId: input.seo?.imageId ?? null,
    noindex: input.seo?.noindex ?? false,
    ogImageId: input.seo?.ogImageId ?? null,
    path: pathForEntity(input),
    scheduledAt: input.scheduledAt ?? null,
    sitemapInclude: input.seo?.sitemapInclude ?? true,
    slug: input.slug,
    status: input.status,
    subtype: input.subtype ?? null,
    title: input.seo?.title ?? input.title,
    updatedAt: input.updatedAt,
  }
}

export async function listSeoEntities(input: { q?: string; type: SeoEntityType }) {
  const seoRows = await db
    .select()
    .from(seoMetadata)
    .where(and(eq(seoMetadata.entityType, input.type), isNull(seoMetadata.deletedAt)))
  const seo = seoByEntity(seoRows)

  if (input.type === 'page') {
    const filters = [isNull(pages.deletedAt)]
    applySearch(filters, pages, input.q)
    const rows = await db
      .select()
      .from(pages)
      .where(and(...filters))
      .orderBy(asc(pages.routePath))

    return rows.map((row) =>
      itemFromEntity({
        entityType: 'page',
        id: row.id,
        routePath: row.routePath,
        scheduledAt: row.scheduledAt,
        seo: seo.get(`page:${row.id}`),
        slug: row.slug,
        status: row.status,
        subtype: row.type,
        title: row.title,
        updatedAt: row.updatedAt,
      }),
    )
  }

  if (input.type === 'service') {
    const filters = [isNull(services.deletedAt)]
    applySearch(filters, services, input.q)
    const rows = await db
      .select()
      .from(services)
      .where(and(...filters))
      .orderBy(asc(services.slug))

    return rows.map((row) =>
      itemFromEntity({
        entityType: 'service',
        id: row.id,
        seo: seo.get(`service:${row.id}`),
        slug: row.slug,
        status: row.status,
        title: row.title,
        updatedAt: row.updatedAt,
      }),
    )
  }

  if (input.type === 'project') {
    const filters = [isNull(projects.deletedAt)]
    applySearch(filters, projects, input.q)
    const rows = await db
      .select()
      .from(projects)
      .where(and(...filters))
      .orderBy(asc(projects.slug))

    return rows.map((row) =>
      itemFromEntity({
        entityType: 'project',
        id: row.id,
        seo: seo.get(`project:${row.id}`),
        slug: row.slug,
        status: row.status,
        title: row.title,
        updatedAt: row.updatedAt,
      }),
    )
  }

  const filters = [isNull(posts.deletedAt)]
  applySearch(filters, posts, input.q)
  const rows = await db
    .select()
    .from(posts)
    .where(and(...filters))
    .orderBy(asc(posts.slug))

  return rows.map((row) =>
    itemFromEntity({
      entityType: 'post',
      id: row.id,
      seo: seo.get(`post:${row.id}`),
      scheduledAt: row.scheduledAt,
      slug: row.slug,
      status: row.status,
      title: row.title,
      updatedAt: row.updatedAt,
    }),
  )
}

export async function getSeoEntity(
  entityType: SeoEntityType,
  id: string,
): Promise<SeoEntityDetail | null> {
  const seo = await db.query.seoMetadata.findFirst({
    where: and(
      eq(seoMetadata.entityType, entityType),
      eq(seoMetadata.entityId, id),
      isNull(seoMetadata.deletedAt),
    ),
  })

  if (entityType === 'page') {
    const row = await db.query.pages.findFirst({
      where: and(eq(pages.id, id), isNull(pages.deletedAt)),
    })
    if (!row) return null

    return {
      ...itemFromEntity({
        entityType,
        id: row.id,
        routePath: row.routePath,
        seo,
        slug: row.slug,
        status: row.status,
        subtype: row.type,
        title: row.title,
        updatedAt: row.updatedAt,
      }),
      excerpt: row.excerpt,
      ogDescription: seo?.ogDescription ?? null,
      ogTitle: seo?.ogTitle ?? null,
      robotsDirectives: seo?.robotsDirectives ?? [],
      schemaJsonLd: seo?.schemaJsonLd ?? null,
    }
  }

  if (entityType === 'service') {
    const row = await db.query.services.findFirst({
      where: and(eq(services.id, id), isNull(services.deletedAt)),
    })
    if (!row) return null

    return {
      ...itemFromEntity({
        entityType,
        id: row.id,
        seo,
        slug: row.slug,
        status: row.status,
        title: row.title,
        updatedAt: row.updatedAt,
      }),
      excerpt: row.excerpt,
      ogDescription: seo?.ogDescription ?? null,
      ogTitle: seo?.ogTitle ?? null,
      robotsDirectives: seo?.robotsDirectives ?? [],
      schemaJsonLd: seo?.schemaJsonLd ?? null,
    }
  }

  if (entityType === 'project') {
    const row = await db.query.projects.findFirst({
      where: and(eq(projects.id, id), isNull(projects.deletedAt)),
    })
    if (!row) return null

    return {
      ...itemFromEntity({
        entityType,
        id: row.id,
        seo,
        slug: row.slug,
        status: row.status,
        title: row.title,
        updatedAt: row.updatedAt,
      }),
      excerpt: row.excerpt,
      ogDescription: seo?.ogDescription ?? null,
      ogTitle: seo?.ogTitle ?? null,
      robotsDirectives: seo?.robotsDirectives ?? [],
      schemaJsonLd: seo?.schemaJsonLd ?? null,
    }
  }

  const row = await db.query.posts.findFirst({
    where: and(eq(posts.id, id), isNull(posts.deletedAt)),
  })
  if (!row) return null

  return {
    ...itemFromEntity({
      entityType,
      id: row.id,
      seo,
      slug: row.slug,
      status: row.status,
      title: row.title,
      updatedAt: row.updatedAt,
    }),
    excerpt: row.excerpt,
    ogDescription: seo?.ogDescription ?? null,
    ogTitle: seo?.ogTitle ?? null,
    robotsDirectives: seo?.robotsDirectives ?? [],
    schemaJsonLd: seo?.schemaJsonLd ?? null,
  }
}

export async function listSeoMediaOptions() {
  return db
    .select({
      alt: mediaAssets.alt,
      filename: mediaAssets.filename,
      id: mediaAssets.id,
      url: mediaAssets.url,
    })
    .from(mediaAssets)
    .where(and(eq(mediaAssets.status, 'active'), isNull(mediaAssets.deletedAt)))
    .orderBy(desc(mediaAssets.updatedAt))
}

export async function listRedirects(input: { q?: string } = {}) {
  const filters = [isNull(redirects.deletedAt)]
  if (input.q?.trim()) {
    const query = `%${input.q.trim()}%`
    filters.push(or(ilike(redirects.fromPath, query), ilike(redirects.toPath, query))!)
  }

  return db
    .select()
    .from(redirects)
    .where(and(...filters))
    .orderBy(desc(redirects.updatedAt))
}

export async function getGlobalRobotsRules() {
  const row = await db.query.seoMetadata.findFirst({
    where: and(eq(seoMetadata.entityType, 'global'), eq(seoMetadata.entityId, 'robots')),
  })
  const rules = row?.metadata?.rules

  return Array.isArray(rules)
    ? rules.filter((rule): rule is string => typeof rule === 'string')
    : []
}

export async function listPublicSeoRoutes(): Promise<PublicSeoRoute[]> {
  const routes: PublicSeoRoute[] = []
  const now = new Date()

  for (const entityType of ['page', 'service', 'project', 'post'] as const) {
    const entities = await listSeoEntities({ type: entityType })

    for (const entity of entities) {
      if (entity.status !== 'published' && entity.status !== 'scheduled') continue
      if (entity.status === 'scheduled' && (!entity.scheduledAt || entity.scheduledAt > now)) {
        continue
      }
      const detail = await getSeoEntity(entity.entityType, entity.id)

      routes.push({
        entityId: entity.id,
        entityType,
        noindex: detail?.noindex ?? false,
        path: entity.path,
        robotsDirectives: detail?.robotsDirectives ?? [],
        sitemapInclude: detail?.sitemapInclude ?? true,
        updatedAt: entity.updatedAt.toISOString(),
      })
    }
  }

  return routes.sort((a, b) => a.path.localeCompare(b.path))
}

export async function listPublicRedirects() {
  return db
    .select()
    .from(redirects)
    .where(and(eq(redirects.active, true), isNull(redirects.deletedAt)))
    .orderBy(asc(redirects.fromPath))
}

export async function listAllSeoPaths() {
  const [pageRows, serviceRows, projectRows, postRows] = await Promise.all([
    db.select().from(pages).where(isNull(pages.deletedAt)),
    db.select().from(services).where(isNull(services.deletedAt)),
    db.select().from(projects).where(isNull(projects.deletedAt)),
    db.select().from(posts).where(isNull(posts.deletedAt)),
  ])

  return [
    ...pageRows.map((row) => ({
      entityId: row.id,
      entityType: 'page' as const,
      path: pathForEntity({ entityType: 'page', routePath: row.routePath, slug: row.slug }),
    })),
    ...serviceRows.map((row) => ({
      entityId: row.id,
      entityType: 'service' as const,
      path: pathForEntity({ entityType: 'service', slug: row.slug }),
    })),
    ...projectRows.map((row) => ({
      entityId: row.id,
      entityType: 'project' as const,
      path: pathForEntity({ entityType: 'project', slug: row.slug }),
    })),
    ...postRows.map((row) => ({
      entityId: row.id,
      entityType: 'post' as const,
      path: pathForEntity({ entityType: 'post', slug: row.slug }),
    })),
  ]
}
