'use server'

import {
  categories,
  db,
  postCategories,
  postRelatedPosts,
  posts,
  postTags,
  redirects,
  seoMetadata,
  tags,
} from '@ziftlab/db'
import { and, eq, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { slugify } from '@/lib/content/types'
import { requirePermission, recordActivity } from '@/lib/rbac/access'
import { verifyCsrf } from '@/lib/security/csrf'
import { sanitizeHtml } from '@/lib/security/sanitize-html'
import { listAllSeoPaths } from '@/lib/seo/queries'
import {
  defaultRobotsForNoindex,
  normalizePath,
  normalizeRobotsDirectives,
  pathForEntity,
  splitRobotsDirectives,
} from '@/lib/seo/types'

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

function formIds(formData: FormData, key: string): string[] {
  return [
    ...new Set(
      formData
        .getAll(key)
        .filter((value): value is string => typeof value === 'string')
        .filter((value) => uuidSchema.safeParse(value).success),
    ),
  ]
}

function postRedirect(postId: string, suffix = 'status=updated'): never {
  redirect(`/dashboard/blog/${postId}?${suffix}`)
}

function parseCanonical(value: string): string | null | 'invalid' {
  if (!value) return null

  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'invalid'

    return url.href
  } catch {
    return 'invalid'
  }
}

function parseJsonLd(
  value: string,
): Record<string, unknown> | Record<string, unknown>[] | null | 'invalid' {
  if (!value) return null

  try {
    const parsed = JSON.parse(value)
    const validObject = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    const validArray =
      Array.isArray(parsed) &&
      parsed.every((item) => item && typeof item === 'object' && !Array.isArray(item))

    if (!validObject && !validArray) return 'invalid'

    return parsed as Record<string, unknown> | Record<string, unknown>[]
  } catch {
    return 'invalid'
  }
}

async function findPostBySlug(slug: string) {
  return db.query.posts.findFirst({ where: eq(posts.slug, slug) })
}

async function assertPostPathAvailable(postId: string, slug: string): Promise<boolean> {
  const path = normalizePath(pathForEntity({ entityType: 'post', slug }))
  if (RESERVED_STATIC_PATHS.has(path)) return false

  const owners = await listAllSeoPaths()
  const owner = owners.find(
    (item) => item.path === path && (item.entityId !== postId || item.entityType !== 'post'),
  )
  if (owner) return false

  const activeRedirect = await db.query.redirects.findFirst({
    where: and(
      eq(redirects.fromPath, path),
      eq(redirects.active, true),
      isNull(redirects.deletedAt),
    ),
  })

  return !activeRedirect
}

async function upsertRedirect(input: { actorId: string; fromPath: string; toPath: string }) {
  if (input.fromPath === input.toPath) return

  const existing = await db.query.redirects.findFirst({
    where: eq(redirects.fromPath, input.fromPath),
  })

  if (existing) {
    await db
      .update(redirects)
      .set({
        active: true,
        deletedAt: null,
        statusCode: 301,
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
    statusCode: 301,
    toPath: input.toPath,
    updatedBy: input.actorId,
  })
}

async function replacePostRelations(input: {
  categoryIds: string[]
  postId: string
  relatedPostIds: string[]
  tagIds: string[]
}) {
  await db.delete(postCategories).where(eq(postCategories.postId, input.postId))
  await db.delete(postTags).where(eq(postTags.postId, input.postId))
  await db.delete(postRelatedPosts).where(eq(postRelatedPosts.postId, input.postId))

  if (input.categoryIds.length > 0) {
    await db.insert(postCategories).values(
      input.categoryIds.map((categoryId, position) => ({
        categoryId,
        position,
        postId: input.postId,
      })),
    )
  }

  if (input.tagIds.length > 0) {
    await db.insert(postTags).values(
      input.tagIds.map((tagId) => ({
        postId: input.postId,
        tagId,
      })),
    )
  }

  const relatedPostIds = input.relatedPostIds.filter(
    (relatedPostId) => relatedPostId !== input.postId,
  )
  if (relatedPostIds.length > 0) {
    await db.insert(postRelatedPosts).values(
      relatedPostIds.map((relatedPostId, position) => ({
        position,
        postId: input.postId,
        relatedPostId,
      })),
    )
  }
}

export async function createPost(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('content.manage')
  const title = formString(formData, 'title')
  const excerpt = formString(formData, 'excerpt')
  const slug = slugify(formString(formData, 'slug') || title)
  if (!title || !excerpt || !slug) redirect('/dashboard/blog/new?error=invalid')

  const existing = await findPostBySlug(slug)
  if (existing) redirect('/dashboard/blog/new?error=duplicate')

  const [created] = await db
    .insert(posts)
    .values({
      authorId: current.user.id,
      content: { html: '' },
      createdBy: current.user.id,
      excerpt,
      slug,
      status: 'draft',
      title,
      updatedBy: current.user.id,
    })
    .returning({ id: posts.id })

  await db.insert(seoMetadata).values({
    description: excerpt,
    entityId: created.id,
    entityType: 'post',
    robotsDirectives: defaultRobotsForNoindex(false),
    sitemapInclude: true,
    title,
  })

  await recordActivity({
    action: 'blog.post_created',
    actorId: current.user.id,
    entityId: created.id,
    entityType: 'post',
    metadata: { slug },
  })

  revalidatePath('/dashboard/blog')
  redirect(`/dashboard/blog/${created.id}?status=created`)
}

export async function updatePostDetails(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('content.manage')
  const postId = formString(formData, 'postId')
  if (!uuidSchema.safeParse(postId).success) redirect('/dashboard/blog?error=invalid')

  const existing = await db.query.posts.findFirst({
    where: and(eq(posts.id, postId), isNull(posts.deletedAt)),
  })
  if (!existing) redirect('/dashboard/blog?error=invalid')

  const title = formString(formData, 'title')
  const excerpt = formString(formData, 'excerpt')
  const slug = slugify(formString(formData, 'slug') || title)
  const contentHtml = sanitizeHtml(formString(formData, 'contentHtml'))
  if (!title || !excerpt || !slug) postRedirect(postId, 'error=invalid')

  const duplicate = await findPostBySlug(slug)
  if (duplicate && duplicate.id !== postId) postRedirect(postId, 'error=duplicate')

  const oldPath = pathForEntity({ entityType: 'post', slug: existing.slug })
  const nextPath = pathForEntity({ entityType: 'post', slug })
  const pathAvailable = oldPath === nextPath || (await assertPostPathAvailable(postId, slug))
  if (!pathAvailable) postRedirect(postId, 'error=duplicate')

  const authorId = nullableString(formString(formData, 'authorId'))
  const coverImageId = nullableString(formString(formData, 'coverImageId'))
  const now = new Date()

  await db
    .update(posts)
    .set({
      authorId,
      content: { html: contentHtml },
      coverImageId,
      excerpt,
      slug,
      title,
      updatedAt: now,
      updatedBy: current.user.id,
    })
    .where(eq(posts.id, postId))

  await replacePostRelations({
    categoryIds: formIds(formData, 'categoryIds'),
    postId,
    relatedPostIds: formIds(formData, 'relatedPostIds'),
    tagIds: formIds(formData, 'tagIds'),
  })

  if (
    (existing.status === 'published' || existing.status === 'scheduled') &&
    oldPath !== nextPath
  ) {
    await upsertRedirect({ actorId: current.user.id, fromPath: oldPath, toPath: nextPath })
  }

  await recordActivity({
    action: 'blog.post_updated',
    actorId: current.user.id,
    entityId: postId,
    entityType: 'post',
    metadata: { slug },
  })

  revalidatePath('/dashboard/blog')
  revalidatePath('/dashboard/seo')
  postRedirect(postId)
}

export async function updatePostSeo(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('seo.manage')
  const postId = formString(formData, 'postId')
  if (!uuidSchema.safeParse(postId).success) redirect('/dashboard/blog?error=invalid')

  const post = await db.query.posts.findFirst({
    where: and(eq(posts.id, postId), isNull(posts.deletedAt)),
  })
  if (!post) redirect('/dashboard/blog?error=invalid')

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

  if (title && title.length > 70) postRedirect(postId, 'tab=seo&error=title-length')
  if (description && description.length > 180)
    postRedirect(postId, 'tab=seo&error=description-length')
  if (ogTitle && ogTitle.length > 95) postRedirect(postId, 'tab=seo&error=og-title-length')
  if (ogDescription && ogDescription.length > 200)
    postRedirect(postId, 'tab=seo&error=og-description-length')
  if (canonicalUrl === 'invalid') postRedirect(postId, 'tab=seo&error=canonical')
  if (schemaJsonLd === 'invalid') postRedirect(postId, 'tab=seo&error=schema')

  const now = new Date()
  const values = {
    canonicalUrl,
    description,
    entityId: postId,
    entityType: 'post',
    imageId: nullableString(formString(formData, 'imageId')),
    metadata: { lastPath: pathForEntity({ entityType: 'post', slug: post.slug }) },
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
    where: and(eq(seoMetadata.entityType, 'post'), eq(seoMetadata.entityId, postId)),
  })

  if (existing) await db.update(seoMetadata).set(values).where(eq(seoMetadata.id, existing.id))
  else await db.insert(seoMetadata).values({ ...values, createdAt: now })

  await recordActivity({
    action: 'blog.post_seo_updated',
    actorId: current.user.id,
    entityId: postId,
    entityType: 'post',
  })

  revalidatePath('/dashboard/blog')
  revalidatePath('/dashboard/seo')
  postRedirect(postId, 'tab=seo&status=updated')
}

export async function publishPost(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('content.manage')
  const postId = formString(formData, 'postId')
  if (!uuidSchema.safeParse(postId).success) redirect('/dashboard/blog?error=invalid')

  await db
    .update(posts)
    .set({
      archivedAt: null,
      publishedAt: new Date(),
      scheduledAt: null,
      status: 'published',
      updatedAt: new Date(),
      updatedBy: current.user.id,
    })
    .where(eq(posts.id, postId))

  await recordActivity({
    action: 'blog.post_published',
    actorId: current.user.id,
    entityId: postId,
    entityType: 'post',
  })

  revalidatePath('/dashboard/blog')
  postRedirect(postId, 'status=published')
}

export async function schedulePost(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('content.manage')
  const postId = formString(formData, 'postId')
  const scheduledAt = formString(formData, 'scheduledAt')
  if (!uuidSchema.safeParse(postId).success || !scheduledAt)
    redirect('/dashboard/blog?error=invalid')

  const date = new Date(scheduledAt)
  if (Number.isNaN(date.getTime())) postRedirect(postId, 'error=invalid')

  await db
    .update(posts)
    .set({
      archivedAt: null,
      publishedAt: date,
      scheduledAt: date,
      status: 'scheduled',
      updatedAt: new Date(),
      updatedBy: current.user.id,
    })
    .where(eq(posts.id, postId))

  await recordActivity({
    action: 'blog.post_scheduled',
    actorId: current.user.id,
    entityId: postId,
    entityType: 'post',
    metadata: { scheduledAt: date.toISOString() },
  })

  revalidatePath('/dashboard/blog')
  postRedirect(postId, 'status=scheduled')
}

export async function unpublishPost(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('content.manage')
  const postId = formString(formData, 'postId')
  if (!uuidSchema.safeParse(postId).success) redirect('/dashboard/blog?error=invalid')

  await db
    .update(posts)
    .set({
      publishedAt: null,
      scheduledAt: null,
      status: 'draft',
      updatedAt: new Date(),
      updatedBy: current.user.id,
    })
    .where(eq(posts.id, postId))

  await recordActivity({
    action: 'blog.post_unpublished',
    actorId: current.user.id,
    entityId: postId,
    entityType: 'post',
  })

  revalidatePath('/dashboard/blog')
  postRedirect(postId, 'status=unpublished')
}

export async function archivePost(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('content.manage')
  const postId = formString(formData, 'postId')
  if (!uuidSchema.safeParse(postId).success) redirect('/dashboard/blog?error=invalid')

  await db
    .update(posts)
    .set({
      archivedAt: new Date(),
      scheduledAt: null,
      status: 'archived',
      updatedAt: new Date(),
      updatedBy: current.user.id,
    })
    .where(eq(posts.id, postId))

  await recordActivity({
    action: 'blog.post_archived',
    actorId: current.user.id,
    entityId: postId,
    entityType: 'post',
  })

  revalidatePath('/dashboard/blog')
  postRedirect(postId, 'status=archived')
}

export async function deletePost(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('content.manage')
  const postId = formString(formData, 'postId')
  if (!uuidSchema.safeParse(postId).success) redirect('/dashboard/blog?error=invalid')

  await db
    .update(posts)
    .set({
      deletedAt: new Date(),
      status: 'archived',
      updatedAt: new Date(),
      updatedBy: current.user.id,
    })
    .where(eq(posts.id, postId))

  await recordActivity({
    action: 'blog.post_deleted',
    actorId: current.user.id,
    entityId: postId,
    entityType: 'post',
  })

  revalidatePath('/dashboard/blog')
  redirect('/dashboard/blog?status=deleted')
}

export async function saveCategory(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('content.manage')
  const categoryId = formString(formData, 'categoryId')
  const title = formString(formData, 'title')
  const slug = slugify(formString(formData, 'slug') || title)
  if (!title || !slug) redirect('/dashboard/blog/categories?error=invalid')

  const existing = await db.query.categories.findFirst({ where: eq(categories.slug, slug) })
  if (existing && existing.id !== categoryId && !existing.deletedAt) {
    redirect('/dashboard/blog/categories?error=duplicate')
  }

  if (categoryId && uuidSchema.safeParse(categoryId).success) {
    await db
      .update(categories)
      .set({
        description: nullableString(formString(formData, 'description')),
        slug,
        title,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, categoryId))
  } else if (existing?.deletedAt) {
    await db
      .update(categories)
      .set({
        deletedAt: null,
        description: nullableString(formString(formData, 'description')),
        slug,
        title,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, existing.id))
  } else {
    await db.insert(categories).values({
      description: nullableString(formString(formData, 'description')),
      slug,
      title,
    })
  }

  await recordActivity({
    action: 'blog.category_saved',
    actorId: current.user.id,
    entityId: categoryId || slug,
    entityType: 'category',
    metadata: { slug },
  })

  revalidatePath('/dashboard/blog')
  redirect('/dashboard/blog/categories?status=updated')
}

export async function deleteCategory(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('content.manage')
  const categoryId = formString(formData, 'categoryId')
  if (!uuidSchema.safeParse(categoryId).success)
    redirect('/dashboard/blog/categories?error=invalid')

  await db.delete(postCategories).where(eq(postCategories.categoryId, categoryId))
  await db.update(categories).set({ deletedAt: new Date() }).where(eq(categories.id, categoryId))
  await recordActivity({
    action: 'blog.category_deleted',
    actorId: current.user.id,
    entityId: categoryId,
    entityType: 'category',
  })

  revalidatePath('/dashboard/blog')
  redirect('/dashboard/blog/categories?status=deleted')
}

export async function saveTag(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('content.manage')
  const tagId = formString(formData, 'tagId')
  const title = formString(formData, 'title')
  const slug = slugify(formString(formData, 'slug') || title).slice(0, 120)
  if (!title || !slug) redirect('/dashboard/blog/tags?error=invalid')

  const existing = await db.query.tags.findFirst({ where: eq(tags.slug, slug) })
  if (existing && existing.id !== tagId && !existing.deletedAt) {
    redirect('/dashboard/blog/tags?error=duplicate')
  }

  if (tagId && uuidSchema.safeParse(tagId).success) {
    await db
      .update(tags)
      .set({
        slug,
        title,
        updatedAt: new Date(),
      })
      .where(eq(tags.id, tagId))
  } else if (existing?.deletedAt) {
    await db
      .update(tags)
      .set({
        deletedAt: null,
        slug,
        title,
        updatedAt: new Date(),
      })
      .where(eq(tags.id, existing.id))
  } else {
    await db.insert(tags).values({ slug, title })
  }

  await recordActivity({
    action: 'blog.tag_saved',
    actorId: current.user.id,
    entityId: tagId || slug,
    entityType: 'tag',
    metadata: { slug },
  })

  revalidatePath('/dashboard/blog')
  redirect('/dashboard/blog/tags?status=updated')
}

export async function deleteTag(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('content.manage')
  const tagId = formString(formData, 'tagId')
  if (!uuidSchema.safeParse(tagId).success) redirect('/dashboard/blog/tags?error=invalid')

  await db.delete(postTags).where(eq(postTags.tagId, tagId))
  await db.update(tags).set({ deletedAt: new Date() }).where(eq(tags.id, tagId))
  await recordActivity({
    action: 'blog.tag_deleted',
    actorId: current.user.id,
    entityId: tagId,
    entityType: 'tag',
  })

  revalidatePath('/dashboard/blog')
  redirect('/dashboard/blog/tags?status=deleted')
}
