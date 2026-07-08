'use server'

import { db, pageSections, pageVersions, pages, seoMetadata } from '@ziftlab/db'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { recordAuditEvent } from '@/lib/audit/service'
import { recordActivity, requirePermission } from '@/lib/rbac/access'
import { verifyCsrf } from '@/lib/security/csrf'

import { createPageVersion } from './snapshots'
import {
  defaultSectionData,
  isReservedPageType,
  pageTypeSchema,
  reservedPageSlug,
  routePathForPage,
  sectionKindSchema,
  slugify,
  type JsonRecord,
  type SectionKind,
} from './types'

const uuidSchema = z.string().uuid()

const createPageSchema = z.object({
  excerpt: z.string().trim().max(600).optional(),
  slug: z.string().trim().max(220).optional(),
  title: z.string().trim().min(2).max(240),
  type: pageTypeSchema,
})

const updatePageSchema = z.object({
  excerpt: z.string().trim().max(600).optional(),
  pageId: uuidSchema,
  slug: z.string().trim().max(220).optional(),
  title: z.string().trim().min(2).max(240),
  type: pageTypeSchema,
})

function formString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function nullableString(value: string): string | null {
  return value.length > 0 ? value : null
}

function parseLineItems(value: string, firstKey: string, secondKey: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [first = '', ...rest] = line.split('|')
      return {
        [firstKey]: first.trim(),
        [secondKey]: rest.join('|').trim(),
      }
    })
    .filter((item) => String(item[firstKey]).length > 0)
}

function sectionDataFromFormData(kind: SectionKind, formData: FormData): JsonRecord {
  const title = formString(formData, 'title')
  const subtitle = formString(formData, 'subtitle')
  const text = formString(formData, 'text')
  const imageId = nullableString(formString(formData, 'imageId'))

  if (kind === 'hero') {
    return {
      eyebrow: formString(formData, 'eyebrow'),
      imageId,
      primaryCta: {
        href: formString(formData, 'primaryHref'),
        label: formString(formData, 'primaryLabel'),
      },
      secondaryCta: {
        href: formString(formData, 'secondaryHref'),
        label: formString(formData, 'secondaryLabel'),
      },
      subtitle,
      title,
    }
  }

  if (kind === 'cta') {
    return {
      cta: {
        href: formString(formData, 'primaryHref'),
        label: formString(formData, 'primaryLabel'),
      },
      text,
      title,
    }
  }

  if (kind === 'stats') {
    return {
      items: parseLineItems(formString(formData, 'items'), 'value', 'label'),
      title,
    }
  }

  if (kind === 'benefits' || kind === 'process' || kind === 'faq') {
    return {
      items: parseLineItems(formString(formData, 'items'), 'title', 'text'),
      subtitle,
      title,
    }
  }

  if (
    kind === 'featured_services' ||
    kind === 'featured_projects' ||
    kind === 'testimonials' ||
    kind === 'clients'
  ) {
    return { subtitle, title }
  }

  if (kind === 'rich_text') {
    return { body: formString(formData, 'body') }
  }

  if (kind === 'image_banner') {
    return { imageId, text, title }
  }

  return { text, title }
}

function jsonFromTextarea(value: string): JsonRecord {
  if (!value) return {}

  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

async function snapshotAndRecord(input: {
  action: string
  actorId: string
  after?: Record<string, unknown> | null
  before?: Record<string, unknown> | null
  entityId: string
  metadata?: Record<string, unknown>
}) {
  await createPageVersion({ actorId: input.actorId, pageId: input.entityId })
  await recordActivity({
    action: input.action,
    actorId: input.actorId,
    entityId: input.entityId,
    entityType: 'page',
    metadata: input.metadata,
  })
  if (input.before !== undefined || input.after !== undefined) {
    await recordAuditEvent({
      action: input.action,
      actorId: input.actorId,
      after: input.after ?? null,
      before: input.before ?? null,
      entityId: input.entityId,
      entityType: 'page',
      metadata: input.metadata,
      severity: 'notice',
      source: 'content',
      timeline: false,
    })
  }
}

export async function createPage(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('content.manage')
  const parsed = createPageSchema.safeParse({
    excerpt: formData.get('excerpt'),
    slug: formData.get('slug'),
    title: formData.get('title'),
    type: formData.get('type'),
  })

  if (!parsed.success) redirect('/dashboard/pages/new?error=invalid')

  const type = parsed.data.type
  const reservedSlug = reservedPageSlug(type)
  const slug = reservedSlug ?? slugify(parsed.data.slug || parsed.data.title)
  if (!slug) redirect('/dashboard/pages/new?error=invalid')

  const now = new Date()
  const [created] = await db
    .insert(pages)
    .values({
      content: {},
      createdBy: current.user.id,
      excerpt: parsed.data.excerpt ?? null,
      routePath: routePathForPage({ slug, type }),
      slug,
      status: 'draft',
      title: parsed.data.title,
      type,
      updatedBy: current.user.id,
    })
    .returning({ id: pages.id })

  await db.insert(pageSections).values({
    createdAt: now,
    createdBy: current.user.id,
    data: defaultSectionData(type === 'home' ? 'hero' : 'text'),
    kind: type === 'home' ? 'hero' : 'text',
    label: type === 'home' ? 'Hero' : 'Intro',
    pageId: created.id,
    position: 0,
    updatedAt: now,
    updatedBy: current.user.id,
  })

  await snapshotAndRecord({
    action: 'content.page_created',
    after: { slug, status: 'draft', title: parsed.data.title, type },
    actorId: current.user.id,
    entityId: created.id,
    metadata: { slug, type },
  })

  revalidatePath('/dashboard/pages')
  redirect(`/dashboard/pages/${created.id}?status=created`)
}

export async function updatePageDetails(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('content.manage')
  const parsed = updatePageSchema.safeParse({
    excerpt: formData.get('excerpt'),
    pageId: formData.get('pageId'),
    slug: formData.get('slug'),
    title: formData.get('title'),
    type: formData.get('type'),
  })

  if (!parsed.success) redirect('/dashboard/pages?error=invalid')

  const [existing] = await db.select().from(pages).where(eq(pages.id, parsed.data.pageId)).limit(1)
  if (!existing) redirect('/dashboard/pages?error=invalid')

  const type = parsed.data.type
  const slug = reservedPageSlug(type) ?? slugify(parsed.data.slug || parsed.data.title)
  if (!slug) redirect(`/dashboard/pages/${parsed.data.pageId}?error=invalid`)

  await db
    .update(pages)
    .set({
      excerpt: parsed.data.excerpt ?? null,
      routePath: routePathForPage({ slug, type }),
      slug,
      title: parsed.data.title,
      type,
      updatedAt: new Date(),
      updatedBy: current.user.id,
    })
    .where(eq(pages.id, parsed.data.pageId))

  await snapshotAndRecord({
    action: 'content.page_updated',
    after: {
      excerpt: parsed.data.excerpt ?? null,
      routePath: routePathForPage({ slug, type }),
      slug,
      title: parsed.data.title,
      type,
    },
    actorId: current.user.id,
    before: {
      excerpt: existing.excerpt,
      routePath: existing.routePath,
      slug: existing.slug,
      title: existing.title,
      type: existing.type,
    },
    entityId: parsed.data.pageId,
    metadata: { slug, type },
  })

  revalidatePath('/dashboard/pages')
  redirect(`/dashboard/pages/${parsed.data.pageId}?status=updated`)
}

export async function updatePageSeo(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('seo.manage')
  const pageId = formString(formData, 'pageId')
  if (!uuidSchema.safeParse(pageId).success) redirect('/dashboard/pages?error=invalid')

  const now = new Date()
  const values = {
    canonicalUrl: nullableString(formString(formData, 'canonicalUrl')),
    description: nullableString(formString(formData, 'description')),
    entityId: pageId,
    entityType: 'page',
    imageId: nullableString(formString(formData, 'imageId')),
    noindex: formData.get('noindex') === 'on',
    robotsDirectives:
      formData.get('noindex') === 'on' ? ['noindex', 'nofollow'] : ['index', 'follow'],
    title: nullableString(formString(formData, 'title')),
    updatedAt: now,
  }

  const existing = await db.query.seoMetadata.findFirst({
    where: and(eq(seoMetadata.entityType, 'page'), eq(seoMetadata.entityId, pageId)),
  })

  if (existing) {
    await db.update(seoMetadata).set(values).where(eq(seoMetadata.id, existing.id))
  } else {
    await db.insert(seoMetadata).values({ ...values, createdAt: now })
  }

  await snapshotAndRecord({
    action: 'content.seo_updated',
    actorId: current.user.id,
    entityId: pageId,
  })

  revalidatePath('/dashboard/pages')
  redirect(`/dashboard/pages/${pageId}?tab=seo&status=updated`)
}

export async function addSection(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('content.manage')
  const pageId = formString(formData, 'pageId')
  const parsedKind = sectionKindSchema.safeParse(formData.get('kind'))
  if (!uuidSchema.safeParse(pageId).success || !parsedKind.success) {
    redirect('/dashboard/pages?error=invalid')
  }

  const sections = await db
    .select({ position: pageSections.position })
    .from(pageSections)
    .where(and(eq(pageSections.pageId, pageId), isNull(pageSections.deletedAt)))
    .orderBy(asc(pageSections.position))

  const position =
    sections.length > 0 ? Math.max(...sections.map((section) => section.position)) + 1 : 0
  const now = new Date()

  await db.insert(pageSections).values({
    createdAt: now,
    createdBy: current.user.id,
    data: defaultSectionData(parsedKind.data),
    kind: parsedKind.data,
    label: formString(formData, 'label') || parsedKind.data,
    pageId,
    position,
    updatedAt: now,
    updatedBy: current.user.id,
  })

  await snapshotAndRecord({
    action: 'content.section_added',
    actorId: current.user.id,
    entityId: pageId,
    metadata: { kind: parsedKind.data },
  })

  revalidatePath('/dashboard/pages')
  redirect(`/dashboard/pages/${pageId}?tab=sections&status=updated`)
}

export async function updateSection(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('content.manage')
  const pageId = formString(formData, 'pageId')
  const sectionId = formString(formData, 'sectionId')
  const parsedKind = sectionKindSchema.safeParse(formData.get('kind'))
  if (
    !uuidSchema.safeParse(pageId).success ||
    !uuidSchema.safeParse(sectionId).success ||
    !parsedKind.success
  ) {
    redirect('/dashboard/pages?error=invalid')
  }

  await db
    .update(pageSections)
    .set({
      data: sectionDataFromFormData(parsedKind.data, formData),
      enabled: formData.get('enabled') === 'on',
      kind: parsedKind.data,
      label: formString(formData, 'label') || parsedKind.data,
      position: Number(formString(formData, 'position')) || 0,
      settings: jsonFromTextarea(formString(formData, 'settings')),
      updatedAt: new Date(),
      updatedBy: current.user.id,
    })
    .where(eq(pageSections.id, sectionId))

  await snapshotAndRecord({
    action: 'content.section_updated',
    actorId: current.user.id,
    entityId: pageId,
    metadata: { sectionId },
  })

  revalidatePath('/dashboard/pages')
  redirect(`/dashboard/pages/${pageId}?tab=sections&status=updated`)
}

export async function deleteSection(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('content.manage')
  const pageId = formString(formData, 'pageId')
  const sectionId = formString(formData, 'sectionId')
  if (!uuidSchema.safeParse(pageId).success || !uuidSchema.safeParse(sectionId).success) {
    redirect('/dashboard/pages?error=invalid')
  }

  await db
    .update(pageSections)
    .set({ deletedAt: new Date(), updatedAt: new Date(), updatedBy: current.user.id })
    .where(eq(pageSections.id, sectionId))

  await snapshotAndRecord({
    action: 'content.section_deleted',
    actorId: current.user.id,
    entityId: pageId,
    metadata: { sectionId },
  })

  revalidatePath('/dashboard/pages')
  redirect(`/dashboard/pages/${pageId}?tab=sections&status=deleted`)
}

export async function publishPage(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('content.manage')
  const pageId = formString(formData, 'pageId')
  if (!uuidSchema.safeParse(pageId).success) redirect('/dashboard/pages?error=invalid')

  const [existing] = await db.select().from(pages).where(eq(pages.id, pageId)).limit(1)
  const version = await createPageVersion({ actorId: current.user.id, pageId })
  await db
    .update(pages)
    .set({
      archivedAt: null,
      currentVersionId: version.id,
      publishedAt: new Date(),
      publishedVersionId: version.id,
      scheduledAt: null,
      status: 'published',
      updatedAt: new Date(),
      updatedBy: current.user.id,
    })
    .where(eq(pages.id, pageId))

  await recordActivity({
    action: 'content.page_published',
    actorId: current.user.id,
    entityId: pageId,
    entityType: 'page',
    metadata: { version: version.version },
  })
  await recordAuditEvent({
    action: 'content.page_published',
    actorId: current.user.id,
    after: {
      publishedVersionId: version.id,
      scheduledAt: null,
      status: 'published',
    },
    before: existing
      ? {
          publishedVersionId: existing.publishedVersionId,
          scheduledAt: existing.scheduledAt,
          status: existing.status,
        }
      : null,
    entityId: pageId,
    entityType: 'page',
    metadata: { version: version.version },
    severity: 'notice',
    source: 'content',
    timeline: false,
  })
  revalidatePath('/dashboard/pages')
  redirect(`/dashboard/pages/${pageId}?status=published`)
}

export async function schedulePage(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('content.manage')
  const pageId = formString(formData, 'pageId')
  const scheduledAt = formString(formData, 'scheduledAt')
  if (!uuidSchema.safeParse(pageId).success || !scheduledAt) {
    redirect('/dashboard/pages?error=invalid')
  }

  const date = new Date(scheduledAt)
  if (Number.isNaN(date.getTime())) redirect(`/dashboard/pages/${pageId}?error=invalid`)

  const version = await createPageVersion({ actorId: current.user.id, pageId })
  await db
    .update(pages)
    .set({
      archivedAt: null,
      currentVersionId: version.id,
      publishedVersionId: version.id,
      scheduledAt: date,
      status: 'scheduled',
      updatedAt: new Date(),
      updatedBy: current.user.id,
    })
    .where(eq(pages.id, pageId))

  await recordActivity({
    action: 'content.page_scheduled',
    actorId: current.user.id,
    entityId: pageId,
    entityType: 'page',
    metadata: { scheduledAt: date.toISOString(), version: version.version },
  })
  revalidatePath('/dashboard/pages')
  redirect(`/dashboard/pages/${pageId}?status=scheduled`)
}

export async function unpublishPage(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('content.manage')
  const pageId = formString(formData, 'pageId')
  if (!uuidSchema.safeParse(pageId).success) redirect('/dashboard/pages?error=invalid')

  await db
    .update(pages)
    .set({
      publishedAt: null,
      publishedVersionId: null,
      scheduledAt: null,
      status: 'draft',
      updatedAt: new Date(),
      updatedBy: current.user.id,
    })
    .where(eq(pages.id, pageId))

  await snapshotAndRecord({
    action: 'content.page_unpublished',
    actorId: current.user.id,
    entityId: pageId,
  })
  revalidatePath('/dashboard/pages')
  redirect(`/dashboard/pages/${pageId}?status=unpublished`)
}

export async function archivePage(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('content.manage')
  const pageId = formString(formData, 'pageId')
  if (!uuidSchema.safeParse(pageId).success) redirect('/dashboard/pages?error=invalid')

  await db
    .update(pages)
    .set({
      archivedAt: new Date(),
      publishedVersionId: null,
      scheduledAt: null,
      status: 'archived',
      updatedAt: new Date(),
      updatedBy: current.user.id,
    })
    .where(eq(pages.id, pageId))

  await snapshotAndRecord({
    action: 'content.page_archived',
    actorId: current.user.id,
    entityId: pageId,
  })
  revalidatePath('/dashboard/pages')
  redirect(`/dashboard/pages/${pageId}?status=archived`)
}

export async function deletePage(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('content.manage')
  const pageId = formString(formData, 'pageId')
  if (!uuidSchema.safeParse(pageId).success) redirect('/dashboard/pages?error=invalid')

  const [page] = await db.select().from(pages).where(eq(pages.id, pageId)).limit(1)
  if (!page) redirect('/dashboard/pages?error=invalid')

  if (isReservedPageType(page.type)) {
    await archivePage(formData)
    return
  }

  await db
    .update(pages)
    .set({
      deletedAt: new Date(),
      publishedVersionId: null,
      status: 'archived',
      updatedAt: new Date(),
      updatedBy: current.user.id,
    })
    .where(eq(pages.id, pageId))

  await recordActivity({
    action: 'content.page_deleted',
    actorId: current.user.id,
    entityId: pageId,
    entityType: 'page',
  })
  revalidatePath('/dashboard/pages')
  redirect('/dashboard/pages?status=deleted')
}

export async function restoreVersion(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('content.manage')
  const pageId = formString(formData, 'pageId')
  const versionId = formString(formData, 'versionId')
  if (!uuidSchema.safeParse(pageId).success || !uuidSchema.safeParse(versionId).success) {
    redirect('/dashboard/pages?error=invalid')
  }

  const [version] = await db
    .select()
    .from(pageVersions)
    .where(and(eq(pageVersions.id, versionId), eq(pageVersions.pageId, pageId)))
    .limit(1)
  if (!version) redirect(`/dashboard/pages/${pageId}?tab=history&error=invalid`)

  const snapshot = version.data as {
    page?: JsonRecord
    sections?: JsonRecord[]
    seo?: JsonRecord | null
  }
  const pageData = snapshot.page ?? {}

  await db
    .update(pages)
    .set({
      content: (pageData.content as JsonRecord) ?? {},
      excerpt: typeof pageData.excerpt === 'string' ? pageData.excerpt : null,
      status: 'draft',
      title: typeof pageData.title === 'string' ? pageData.title : 'Pagina restaurada',
      updatedAt: new Date(),
      updatedBy: current.user.id,
    })
    .where(eq(pages.id, pageId))

  await db
    .update(pageSections)
    .set({ deletedAt: new Date(), updatedAt: new Date(), updatedBy: current.user.id })
    .where(eq(pageSections.pageId, pageId))

  for (const section of snapshot.sections ?? []) {
    await db.insert(pageSections).values({
      createdBy: current.user.id,
      data: (section.data as JsonRecord) ?? {},
      enabled: section.enabled !== false,
      kind: typeof section.kind === 'string' ? section.kind : 'text',
      label: typeof section.label === 'string' ? section.label : 'Seccion',
      pageId,
      position: typeof section.position === 'number' ? section.position : 0,
      settings: (section.settings as JsonRecord) ?? {},
      updatedBy: current.user.id,
    })
  }

  const seo = snapshot.seo
  if (seo) {
    const values = {
      canonicalUrl: typeof seo.canonicalUrl === 'string' ? seo.canonicalUrl : null,
      description: typeof seo.description === 'string' ? seo.description : null,
      imageId: typeof seo.imageId === 'string' ? seo.imageId : null,
      noindex: seo.noindex === true,
      ogDescription: typeof seo.ogDescription === 'string' ? seo.ogDescription : null,
      ogImageId: typeof seo.ogImageId === 'string' ? seo.ogImageId : null,
      ogTitle: typeof seo.ogTitle === 'string' ? seo.ogTitle : null,
      robotsDirectives: Array.isArray(seo.robotsDirectives)
        ? seo.robotsDirectives.filter((item): item is string => typeof item === 'string')
        : [],
      schemaJsonLd:
        seo.schemaJsonLd && typeof seo.schemaJsonLd === 'object'
          ? (seo.schemaJsonLd as JsonRecord)
          : null,
      sitemapInclude: seo.sitemapInclude !== false,
      title: typeof seo.title === 'string' ? seo.title : null,
      updatedAt: new Date(),
    }
    const existing = await db.query.seoMetadata.findFirst({
      where: and(eq(seoMetadata.entityType, 'page'), eq(seoMetadata.entityId, pageId)),
    })
    if (existing) await db.update(seoMetadata).set(values).where(eq(seoMetadata.id, existing.id))
    else await db.insert(seoMetadata).values({ ...values, entityId: pageId, entityType: 'page' })
  }

  await snapshotAndRecord({
    action: 'content.version_restored',
    actorId: current.user.id,
    entityId: pageId,
    metadata: { restoredVersion: version.version },
  })
  revalidatePath('/dashboard/pages')
  redirect(`/dashboard/pages/${pageId}?tab=history&status=restored`)
}
