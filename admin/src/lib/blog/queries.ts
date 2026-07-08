import 'server-only'

import {
  categories,
  db,
  mediaAssets,
  postCategories,
  postRelatedPosts,
  posts,
  postTags,
  seoMetadata,
  tags,
  users,
} from '@ziftlab/db'
import { and, asc, desc, eq, ilike, inArray, isNull, or } from 'drizzle-orm'

import { listMediaAssets } from '@/lib/media/queries'

import { BLOG_STATUSES, type BlogStatus } from './constants'

export interface BlogFilters {
  authorId?: string
  categoryId?: string
  q?: string
  status?: string
  tagId?: string
}

export interface BlogPostListItem {
  authorEmail: string | null
  authorId: string | null
  authorName: string | null
  categories: { id: string; slug: string; title: string }[]
  coverAlt: string | null
  coverImageId: string | null
  excerpt: string
  id: string
  publishedAt: Date | null
  scheduledAt: Date | null
  slug: string
  status: string
  tags: { id: string; slug: string; title: string }[]
  title: string
  updatedAt: Date
}

export type BlogPostEditor = Awaited<ReturnType<typeof getBlogPostEditor>>

function clean(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export function parseBlogFilters(
  input:
    | {
        authorId?: unknown
        categoryId?: unknown
        q?: unknown
        status?: unknown
        tagId?: unknown
      }
    | undefined,
): BlogFilters {
  return {
    authorId: clean(input?.authorId),
    categoryId: clean(input?.categoryId),
    q: clean(input?.q),
    status: clean(input?.status),
    tagId: clean(input?.tagId),
  }
}

function isBlogStatus(value: string | undefined): value is BlogStatus {
  return BLOG_STATUSES.includes(value as BlogStatus)
}

async function categoriesByPost(postIds: string[]) {
  const map = new Map<string, { id: string; slug: string; title: string }[]>()
  if (postIds.length === 0) return map

  const rows = await db
    .select({
      id: categories.id,
      postId: postCategories.postId,
      slug: categories.slug,
      title: categories.title,
    })
    .from(postCategories)
    .innerJoin(categories, eq(postCategories.categoryId, categories.id))
    .where(and(inArray(postCategories.postId, postIds), isNull(categories.deletedAt)))
    .orderBy(asc(postCategories.position), asc(categories.title))

  for (const row of rows) {
    const list = map.get(row.postId) ?? []
    list.push({ id: row.id, slug: row.slug, title: row.title })
    map.set(row.postId, list)
  }

  return map
}

async function tagsByPost(postIds: string[]) {
  const map = new Map<string, { id: string; slug: string; title: string }[]>()
  if (postIds.length === 0) return map

  const rows = await db
    .select({
      id: tags.id,
      postId: postTags.postId,
      slug: tags.slug,
      title: tags.title,
    })
    .from(postTags)
    .innerJoin(tags, eq(postTags.tagId, tags.id))
    .where(and(inArray(postTags.postId, postIds), isNull(tags.deletedAt)))
    .orderBy(asc(tags.title))

  for (const row of rows) {
    const list = map.get(row.postId) ?? []
    list.push({ id: row.id, slug: row.slug, title: row.title })
    map.set(row.postId, list)
  }

  return map
}

async function relatedIdsByPost(postIds: string[]) {
  const map = new Map<string, string[]>()
  if (postIds.length === 0) return map

  const rows = await db
    .select({
      postId: postRelatedPosts.postId,
      relatedPostId: postRelatedPosts.relatedPostId,
    })
    .from(postRelatedPosts)
    .where(inArray(postRelatedPosts.postId, postIds))
    .orderBy(asc(postRelatedPosts.position))

  for (const row of rows) {
    const list = map.get(row.postId) ?? []
    list.push(row.relatedPostId)
    map.set(row.postId, list)
  }

  return map
}

export async function listBlogPosts(input: BlogFilters = {}): Promise<BlogPostListItem[]> {
  const filters = [isNull(posts.deletedAt)]
  if (isBlogStatus(input.status)) filters.push(eq(posts.status, input.status))
  if (input.authorId) filters.push(eq(posts.authorId, input.authorId))
  if (input.q?.trim()) {
    const query = `%${input.q.trim()}%`
    filters.push(
      or(ilike(posts.title, query), ilike(posts.slug, query), ilike(posts.excerpt, query))!,
    )
  }

  const rows = await db
    .select({
      authorEmail: users.email,
      authorId: posts.authorId,
      authorName: users.name,
      coverAlt: mediaAssets.alt,
      coverImageId: posts.coverImageId,
      excerpt: posts.excerpt,
      id: posts.id,
      publishedAt: posts.publishedAt,
      scheduledAt: posts.scheduledAt,
      slug: posts.slug,
      status: posts.status,
      title: posts.title,
      updatedAt: posts.updatedAt,
    })
    .from(posts)
    .leftJoin(users, eq(posts.authorId, users.id))
    .leftJoin(mediaAssets, eq(posts.coverImageId, mediaAssets.id))
    .where(and(...filters))
    .orderBy(desc(posts.updatedAt))

  const ids = rows.map((row) => row.id)
  const [categoryMap, tagMap] = await Promise.all([categoriesByPost(ids), tagsByPost(ids)])

  return rows
    .map((row) => ({
      ...row,
      categories: categoryMap.get(row.id) ?? [],
      tags: tagMap.get(row.id) ?? [],
    }))
    .filter((post) =>
      input.categoryId
        ? post.categories.some((category) => category.id === input.categoryId)
        : true,
    )
    .filter((post) => (input.tagId ? post.tags.some((tag) => tag.id === input.tagId) : true))
}

export async function getBlogStats(input: BlogFilters = {}) {
  const posts = await listBlogPosts({ ...input, status: undefined })

  return {
    archived: posts.filter((post) => post.status === 'archived').length,
    draft: posts.filter((post) => post.status === 'draft').length,
    published: posts.filter((post) => post.status === 'published').length,
    scheduled: posts.filter((post) => post.status === 'scheduled').length,
    total: posts.length,
  }
}

export async function listBlogCategories() {
  const [rows, relations] = await Promise.all([
    db.select().from(categories).where(isNull(categories.deletedAt)).orderBy(asc(categories.title)),
    db
      .select({ categoryId: postCategories.categoryId })
      .from(postCategories)
      .innerJoin(posts, eq(postCategories.postId, posts.id))
      .where(isNull(posts.deletedAt)),
  ])
  const counts = new Map<string, number>()
  for (const relation of relations) {
    counts.set(relation.categoryId, (counts.get(relation.categoryId) ?? 0) + 1)
  }

  return rows.map((row) => ({ ...row, postCount: counts.get(row.id) ?? 0 }))
}

export async function listBlogTags() {
  const [rows, relations] = await Promise.all([
    db.select().from(tags).where(isNull(tags.deletedAt)).orderBy(asc(tags.title)),
    db
      .select({ tagId: postTags.tagId })
      .from(postTags)
      .innerJoin(posts, eq(postTags.postId, posts.id))
      .where(isNull(posts.deletedAt)),
  ])
  const counts = new Map<string, number>()
  for (const relation of relations) {
    counts.set(relation.tagId, (counts.get(relation.tagId) ?? 0) + 1)
  }

  return rows.map((row) => ({ ...row, postCount: counts.get(row.id) ?? 0 }))
}

export async function listBlogAuthors() {
  return db
    .select({
      email: users.email,
      id: users.id,
      name: users.name,
      status: users.status,
    })
    .from(users)
    .where(and(eq(users.status, 'active'), isNull(users.deletedAt)))
    .orderBy(asc(users.name))
}

export async function listBlogPostOptions(currentPostId?: string) {
  const rows = await db
    .select({
      id: posts.id,
      slug: posts.slug,
      status: posts.status,
      title: posts.title,
    })
    .from(posts)
    .where(isNull(posts.deletedAt))
    .orderBy(asc(posts.title))

  return currentPostId ? rows.filter((post) => post.id !== currentPostId) : rows
}

export async function getBlogPostEditor(id: string) {
  const post = await db.query.posts.findFirst({
    where: and(eq(posts.id, id), isNull(posts.deletedAt)),
  })
  if (!post) return null

  const [
    seo,
    media,
    authors,
    categoryRows,
    tagRows,
    postOptions,
    selectedCategories,
    selectedTags,
    related,
  ] = await Promise.all([
    db.query.seoMetadata.findFirst({
      where: and(eq(seoMetadata.entityType, 'post'), eq(seoMetadata.entityId, post.id)),
    }),
    listMediaAssets({ type: 'image' }),
    listBlogAuthors(),
    listBlogCategories(),
    listBlogTags(),
    listBlogPostOptions(post.id),
    categoriesByPost([post.id]),
    tagsByPost([post.id]),
    relatedIdsByPost([post.id]),
  ])

  return {
    authors,
    categories: categoryRows,
    media,
    post,
    postOptions,
    relatedPostIds: related.get(post.id) ?? [],
    selectedCategoryIds: (selectedCategories.get(post.id) ?? []).map((category) => category.id),
    selectedTagIds: (selectedTags.get(post.id) ?? []).map((tag) => tag.id),
    seo,
    tags: tagRows,
  }
}
