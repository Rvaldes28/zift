'use server'

import {
  db,
  pageSections,
  pages,
  posts,
  projects,
  redirects,
  seoMetadata,
  services,
} from '@ziftlab/db'
import { and, eq, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import {
  defaultSectionData,
  reservedPageSlug,
  routePathForPage,
  type PageType,
} from '@/lib/content/types'
import { createPageVersion } from '@/lib/content/snapshots'
import { requirePermission, recordActivity } from '@/lib/rbac/access'
import { verifyCsrf } from '@/lib/security/csrf'

import { listAllSeoPaths } from './queries'
import {
  defaultRobotsForNoindex,
  entityTypeSchema,
  normalizePath,
  normalizeRobotsDirectives,
  pathForEntity,
  slugFromInput,
  splitRobotsDirectives,
  type SeoEntityType,
} from './types'

type JsonRecord = Record<string, unknown>

const uuidSchema = z.string().uuid()

const RESERVED_STATIC_PATHS = new Set([
  '/asesoria',
  '/blog',
  '/cookies',
  '/cotizacion',
  '/gracias',
  '/portafolio',
  '/privacidad',
  '/robots.txt',
  '/rss.xml',
  '/servicios',
  '/sitemap-index.xml',
  '/terminos',
])

function formString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function nullableString(value: string): string | null {
  return value.length > 0 ? value : null
}

function entityRedirect(entityType: SeoEntityType, id: string, suffix = 'status=updated'): never {
  redirect(`/dashboard/seo?tab=${entityType}&entity=${id}&${suffix}`)
}

function redirectWithSeoError(entityType: SeoEntityType, id: string, error: string): never {
  entityRedirect(entityType, id, `error=${error}`)
}

function parseCanonical(value: string): string | null {
  if (!value) return null

  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null

    return url.href
  } catch {
    return null
  }
}

function parseJsonLd(value: string): JsonRecord | JsonRecord[] | null | 'invalid' {
  if (!value) return null

  try {
    const parsed = JSON.parse(value)
    const validObject = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    const validArray =
      Array.isArray(parsed) &&
      parsed.every((item) => item && typeof item === 'object' && !Array.isArray(item))

    if (!validObject && !validArray) return 'invalid'

    return parsed as JsonRecord | JsonRecord[]
  } catch {
    return 'invalid'
  }
}

async function activeRedirectFromPath(path: string) {
  return db.query.redirects.findFirst({
    where: and(
      eq(redirects.fromPath, path),
      eq(redirects.active, true),
      isNull(redirects.deletedAt),
    ),
  })
}

async function assertPathAvailable(input: {
  entityId: string
  entityType: SeoEntityType
  path: string
}) {
  if (RESERVED_STATIC_PATHS.has(input.path)) return false

  const owners = await listAllSeoPaths()
  const owner = owners.find(
    (item) =>
      item.path === input.path &&
      (item.entityId !== input.entityId || item.entityType !== input.entityType),
  )
  if (owner) return false

  const redirect = await activeRedirectFromPath(input.path)

  return !redirect
}

async function upsertRedirect(input: {
  actorId: string
  fromPath: string
  statusCode?: number
  toPath: string
}) {
  if (input.fromPath === input.toPath) return

  const existing = await db.query.redirects.findFirst({
    where: and(eq(redirects.fromPath, input.fromPath), isNull(redirects.deletedAt)),
  })

  if (existing) {
    await db
      .update(redirects)
      .set({
        active: true,
        statusCode: input.statusCode ?? 301,
        toPath: input.toPath,
        updatedAt: new Date(),
        updatedBy: input.actorId,
      })
      .where(eq(redirects.id, existing.id))
    return
  }

  await db.insert(redirects).values({
    active: true,
    createdBy: input.actorId,
    fromPath: input.fromPath,
    statusCode: input.statusCode ?? 301,
    toPath: input.toPath,
    updatedBy: input.actorId,
  })
}

async function getEntityForUpdate(entityType: SeoEntityType, id: string) {
  if (entityType === 'page') {
    const row = await db.query.pages.findFirst({
      where: and(eq(pages.id, id), isNull(pages.deletedAt)),
    })
    return row
      ? {
          routePath: row.routePath,
          slug: row.slug,
          status: row.status,
          subtype: row.type,
          title: row.title,
        }
      : null
  }

  if (entityType === 'service') {
    const row = await db.query.services.findFirst({
      where: and(eq(services.id, id), isNull(services.deletedAt)),
    })
    return row ? { slug: row.slug, status: row.status, subtype: null, title: row.title } : null
  }

  if (entityType === 'project') {
    const row = await db.query.projects.findFirst({
      where: and(eq(projects.id, id), isNull(projects.deletedAt)),
    })
    return row ? { slug: row.slug, status: row.status, subtype: null, title: row.title } : null
  }

  const row = await db.query.posts.findFirst({
    where: and(eq(posts.id, id), isNull(posts.deletedAt)),
  })
  return row ? { slug: row.slug, status: row.status, subtype: null, title: row.title } : null
}

async function updateEntitySlug(input: {
  actorId: string
  entityId: string
  entityType: SeoEntityType
  oldPath: string
  slug: string
}) {
  if (input.entityType === 'page') {
    const page = await db.query.pages.findFirst({ where: eq(pages.id, input.entityId) })
    if (!page) return input.oldPath
    const pageType = page.type as PageType
    const slug = reservedPageSlug(pageType) ?? input.slug
    const routePath = routePathForPage({ slug, type: pageType })

    await db
      .update(pages)
      .set({ routePath, slug, updatedAt: new Date(), updatedBy: input.actorId })
      .where(eq(pages.id, input.entityId))

    return routePath
  }

  if (input.entityType === 'service') {
    await db
      .update(services)
      .set({ slug: input.slug, updatedAt: new Date(), updatedBy: input.actorId })
      .where(eq(services.id, input.entityId))
  }

  if (input.entityType === 'project') {
    await db
      .update(projects)
      .set({ slug: input.slug, updatedAt: new Date(), updatedBy: input.actorId })
      .where(eq(projects.id, input.entityId))
  }

  if (input.entityType === 'post') {
    await db
      .update(posts)
      .set({ slug: input.slug, updatedAt: new Date(), updatedBy: input.actorId })
      .where(eq(posts.id, input.entityId))
  }

  return pathForEntity({ entityType: input.entityType, slug: input.slug })
}

export async function saveSeoEntity(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('seo.manage')
  const entityTypeParsed = entityTypeSchema.safeParse(formData.get('entityType'))
  const entityId = formString(formData, 'entityId')
  if (!entityTypeParsed.success || !uuidSchema.safeParse(entityId).success)
    redirect('/dashboard/seo?error=invalid')

  const entityType = entityTypeParsed.data
  const entity = await getEntityForUpdate(entityType, entityId)
  if (!entity) redirect('/dashboard/seo?error=not-found')

  const title = nullableString(formString(formData, 'title'))
  const description = nullableString(formString(formData, 'description'))
  const ogTitle = nullableString(formString(formData, 'ogTitle'))
  const ogDescription = nullableString(formString(formData, 'ogDescription'))
  const canonicalInput = formString(formData, 'canonicalUrl')
  const canonicalUrl = parseCanonical(canonicalInput)
  const schemaJsonLd = parseJsonLd(formString(formData, 'schemaJsonLd'))
  const noindex = formData.get('noindex') === 'on'
  const sitemapInclude = formData.get('sitemapInclude') === 'on'
  const rawRobots = splitRobotsDirectives(formString(formData, 'robotsDirectives'))
  const robotsDirectives = normalizeRobotsDirectives(
    rawRobots.length > 0 ? rawRobots : defaultRobotsForNoindex(noindex),
  )

  if (title && title.length > 70) redirectWithSeoError(entityType, entityId, 'title-length')
  if (description && description.length > 180)
    redirectWithSeoError(entityType, entityId, 'description-length')
  if (ogTitle && ogTitle.length > 95) redirectWithSeoError(entityType, entityId, 'og-title-length')
  if (ogDescription && ogDescription.length > 200)
    redirectWithSeoError(entityType, entityId, 'og-description-length')
  if (canonicalInput && !canonicalUrl) redirectWithSeoError(entityType, entityId, 'canonical')
  if (schemaJsonLd === 'invalid') redirectWithSeoError(entityType, entityId, 'schema')

  const previousPath = pathForEntity({
    entityType,
    routePath: 'routePath' in entity ? entity.routePath : null,
    slug: entity.slug,
  })
  const requestedSlug = slugFromInput(formString(formData, 'slug') || entity.slug)
  if (!requestedSlug) redirectWithSeoError(entityType, entityId, 'slug')

  const nextPath =
    entityType === 'page' && entity.subtype
      ? routePathForPage({ slug: requestedSlug, type: entity.subtype as PageType })
      : pathForEntity({ entityType, slug: requestedSlug })

  const available =
    nextPath === previousPath ||
    (await assertPathAvailable({ entityId, entityType, path: normalizePath(nextPath) }))
  if (!available) redirectWithSeoError(entityType, entityId, 'duplicate')

  const finalPath = await updateEntitySlug({
    actorId: current.user.id,
    entityId,
    entityType,
    oldPath: previousPath,
    slug: requestedSlug,
  })

  if (formData.get('createRedirect') === 'on' && previousPath !== finalPath) {
    await upsertRedirect({
      actorId: current.user.id,
      fromPath: previousPath,
      statusCode: 301,
      toPath: finalPath,
    })
  }

  const now = new Date()
  const values = {
    canonicalUrl,
    description,
    entityId,
    entityType,
    imageId: nullableString(formString(formData, 'imageId')),
    metadata: { lastPath: finalPath },
    noindex,
    ogDescription,
    ogImageId: nullableString(formString(formData, 'ogImageId')),
    ogTitle,
    robotsDirectives,
    schemaJsonLd,
    sitemapInclude,
    title,
    updatedAt: now,
  }

  const existing = await db.query.seoMetadata.findFirst({
    where: and(eq(seoMetadata.entityType, entityType), eq(seoMetadata.entityId, entityId)),
  })

  if (existing) await db.update(seoMetadata).set(values).where(eq(seoMetadata.id, existing.id))
  else await db.insert(seoMetadata).values({ ...values, createdAt: now })

  if (entityType === 'page') await createPageVersion({ actorId: current.user.id, pageId: entityId })

  await recordActivity({
    action: 'seo.entity_updated',
    actorId: current.user.id,
    entityId,
    entityType,
    metadata: { path: finalPath, previousPath },
  })

  revalidatePath('/dashboard/seo')
  revalidatePath('/dashboard/pages')
  entityRedirect(entityType, entityId)
}

export async function saveRedirect(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('seo.manage')
  const redirectId = formString(formData, 'redirectId')
  const fromPath = normalizePath(formString(formData, 'fromPath'))
  const toPathInput = formString(formData, 'toPath')
  const statusCode = Number(formString(formData, 'statusCode')) === 302 ? 302 : 301
  const active = formData.get('active') === 'on'

  if (!fromPath.startsWith('/') || fromPath === '/')
    redirect('/dashboard/seo?tab=redirects&error=from')
  if (!toPathInput) redirect('/dashboard/seo?tab=redirects&error=to')

  const toPath =
    toPathInput.startsWith('http://') || toPathInput.startsWith('https://')
      ? toPathInput
      : normalizePath(toPathInput)

  if (fromPath === toPath) redirect('/dashboard/seo?tab=redirects&error=same')

  const existing = await db.query.redirects.findFirst({
    where: and(eq(redirects.fromPath, fromPath), isNull(redirects.deletedAt)),
  })
  if (existing && existing.id !== redirectId)
    redirect('/dashboard/seo?tab=redirects&error=duplicate')

  if (redirectId && uuidSchema.safeParse(redirectId).success) {
    await db
      .update(redirects)
      .set({
        active,
        fromPath,
        statusCode,
        toPath,
        updatedAt: new Date(),
        updatedBy: current.user.id,
      })
      .where(eq(redirects.id, redirectId))
  } else {
    await db.insert(redirects).values({
      active,
      createdBy: current.user.id,
      fromPath,
      statusCode,
      toPath,
      updatedBy: current.user.id,
    })
  }

  await recordActivity({
    action: 'seo.redirect_saved',
    actorId: current.user.id,
    entityId: redirectId || fromPath,
    entityType: 'redirect',
    metadata: { active, fromPath, statusCode, toPath },
  })

  revalidatePath('/dashboard/seo')
  redirect('/dashboard/seo?tab=redirects&status=updated')
}

export async function deleteRedirect(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('seo.manage')
  const redirectId = formString(formData, 'redirectId')
  if (!uuidSchema.safeParse(redirectId).success)
    redirect('/dashboard/seo?tab=redirects&error=invalid')

  await db
    .update(redirects)
    .set({
      active: false,
      deletedAt: new Date(),
      updatedAt: new Date(),
      updatedBy: current.user.id,
    })
    .where(eq(redirects.id, redirectId))

  await recordActivity({
    action: 'seo.redirect_deleted',
    actorId: current.user.id,
    entityId: redirectId,
    entityType: 'redirect',
  })

  revalidatePath('/dashboard/seo')
  redirect('/dashboard/seo?tab=redirects&status=deleted')
}

export async function updateRobotsRules(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('seo.manage')
  const rules = formString(formData, 'rules')
    .split('\n')
    .map((rule) => rule.trim())
    .filter(Boolean)
    .slice(0, 80)

  const now = new Date()
  const existing = await db.query.seoMetadata.findFirst({
    where: and(eq(seoMetadata.entityType, 'global'), eq(seoMetadata.entityId, 'robots')),
  })
  const values = {
    entityId: 'robots',
    entityType: 'global',
    metadata: { rules },
    title: 'Robots global rules',
    updatedAt: now,
  }

  if (existing) await db.update(seoMetadata).set(values).where(eq(seoMetadata.id, existing.id))
  else await db.insert(seoMetadata).values({ ...values, createdAt: now })

  await recordActivity({
    action: 'seo.robots_updated',
    actorId: current.user.id,
    entityId: 'robots',
    entityType: 'seo',
    metadata: { rules },
  })

  revalidatePath('/dashboard/seo')
  redirect('/dashboard/seo?tab=robots&status=updated')
}

export async function ensureNotFoundPage(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('seo.manage')
  const existing = await db.query.pages.findFirst({
    where: and(eq(pages.type, 'not_found'), isNull(pages.deletedAt)),
  })

  if (existing) redirect(`/dashboard/pages/${existing.id}?tab=content`)

  const [created] = await db
    .insert(pages)
    .values({
      content: {},
      createdBy: current.user.id,
      excerpt: 'Pagina 404 administrable desde el dashboard propio.',
      routePath: '/404',
      slug: '404',
      status: 'draft',
      title: 'Pagina no encontrada',
      type: 'not_found',
      updatedBy: current.user.id,
    })
    .returning({ id: pages.id })

  await db.insert(pageSections).values({
    createdBy: current.user.id,
    data: {
      ...defaultSectionData('text'),
      text: 'El enlace puede estar roto o la pagina se movio.',
      title: 'Esta pagina no existe.',
    },
    kind: 'text',
    label: 'Mensaje 404',
    pageId: created.id,
    position: 0,
    updatedBy: current.user.id,
  })

  await createPageVersion({ actorId: current.user.id, pageId: created.id })
  await recordActivity({
    action: 'seo.not_found_page_created',
    actorId: current.user.id,
    entityId: created.id,
    entityType: 'page',
  })

  revalidatePath('/dashboard/pages')
  redirect(`/dashboard/pages/${created.id}?status=created`)
}
