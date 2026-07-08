import 'server-only'

import type {
  CollectionSlug,
  Config,
  GlobalSlug,
  JsonRecord,
  Media,
  PaginatedDocs,
} from '@ziftlab/types'
import {
  categories,
  clients,
  db,
  faqs,
  mediaAssets,
  pages,
  postCategories,
  postRelatedPosts,
  posts,
  postTags,
  projects,
  redirects,
  seoMetadata,
  services,
  siteSettings,
  tags,
  teamMembers,
  testimonials,
  users,
} from '@ziftlab/db'
import { and, asc, eq, inArray, isNull, lte, or } from 'drizzle-orm'

import { buildPageSnapshot } from '@/lib/content/snapshots'

import { mediaDoc, paginate, sortDocs, toIso } from './format'

type CollectionDoc<TSlug extends CollectionSlug> = Config['collections'][TSlug]
type GlobalDoc<TSlug extends GlobalSlug> = Config['globals'][TSlug]
type AnyDoc = Record<string, unknown>

type SeoRow = Awaited<ReturnType<typeof seoFor>> extends Map<string, infer T> ? T : never

function nowFilters(
  statusColumn: typeof pages.status | typeof projects.status | typeof services.status,
) {
  return or(eq(statusColumn, 'published'), eq(statusColumn, 'scheduled'))!
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {}
}

function getParam(searchParams: URLSearchParams, key: string): string | null {
  return searchParams.get(key)
}

function getWhere(searchParams: URLSearchParams, field: string, op: string): string | null {
  return searchParams.get(`where[${field}][${op}]`)
}

function getWhereMany(searchParams: URLSearchParams, field: string, op: string): string[] {
  const direct = getWhere(searchParams, field, op)
  if (direct)
    return direct
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

  const prefix = `where[${field}][${op}]`
  return [...searchParams.entries()]
    .filter(([key]) => key.startsWith(`${prefix}[`))
    .map(([, value]) => value)
    .filter(Boolean)
}

function applyWhere(docs: AnyDoc[], searchParams: URLSearchParams): AnyDoc[] {
  let result = docs

  const slugEquals = getWhere(searchParams, 'slug', 'equals')
  if (slugEquals) result = result.filter((doc) => doc.slug === slugEquals)

  const idNotEquals = getWhere(searchParams, 'id', 'not_equals')
  if (idNotEquals) result = result.filter((doc) => doc.id !== idNotEquals)

  const categoryContains = getWhere(searchParams, 'categories', 'contains')
  if (categoryContains) {
    result = result.filter((doc) =>
      Array.isArray(doc.categories)
        ? doc.categories.some((category) =>
            typeof category === 'object' && category !== null
              ? (category as { id?: unknown }).id === categoryContains
              : category === categoryContains,
          )
        : false,
    )
  }

  const categoryIn = getWhereMany(searchParams, 'categories', 'in')
  if (categoryIn.length > 0) {
    result = result.filter((doc) =>
      Array.isArray(doc.categories)
        ? doc.categories.some((category) =>
            typeof category === 'object' && category !== null
              ? categoryIn.includes(String((category as { id?: unknown }).id))
              : categoryIn.includes(String(category)),
          )
        : false,
    )
  }

  return result
}

async function seoFor(entityType: string) {
  const rows = await db
    .select()
    .from(seoMetadata)
    .where(and(eq(seoMetadata.entityType, entityType), isNull(seoMetadata.deletedAt)))

  return new Map(rows.map((row) => [row.entityId, row]))
}

async function mediaById() {
  const rows = await db
    .select()
    .from(mediaAssets)
    .where(and(eq(mediaAssets.status, 'active'), isNull(mediaAssets.deletedAt)))

  return new Map(rows.map((asset) => [asset.id, mediaDoc(asset)]))
}

function mediaFromMetadata(metadata: JsonRecord, media: Map<string, Media>, keys: string[]) {
  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === 'string') {
      const asset = media.get(value)
      if (asset) return asset
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) return value
  }

  return null
}

function metaFor(seo: SeoRow | undefined, media: Map<string, Media>) {
  if (!seo) return null

  return {
    canonicalUrl: seo.canonicalUrl,
    description: seo.description,
    image: seo.imageId ? (media.get(seo.imageId) ?? null) : null,
    imageId: seo.imageId,
    noindex: seo.noindex,
    ogDescription: seo.ogDescription,
    ogImage: seo.ogImageId ? (media.get(seo.ogImageId) ?? null) : null,
    ogImageId: seo.ogImageId,
    ogTitle: seo.ogTitle,
    robotsDirectives: seo.robotsDirectives,
    schemaJsonLd: seo.schemaJsonLd,
    sitemapInclude: seo.sitemapInclude,
    title: seo.title,
  }
}

async function listServices(includeDrafts: boolean) {
  const [rows, seo, media, faqDocs] = await Promise.all([
    db
      .select()
      .from(services)
      .where(
        includeDrafts
          ? isNull(services.deletedAt)
          : and(isNull(services.deletedAt), nowFilters(services.status)),
      )
      .orderBy(asc(services.order), asc(services.slug)),
    seoFor('service'),
    mediaById(),
    listFaqs(),
  ])
  const faqsById = new Map(faqDocs.map((faq) => [faq.id, faq]))

  return rows.map((row) => {
    const metadata = record(row.metadata)
    const faqIds = stringArray(metadata.faqIds ?? metadata.faqs)
    return {
      ...metadata,
      _status: row.status,
      benefits: Array.isArray(metadata.benefits) ? metadata.benefits : [],
      content: row.content,
      createdAt: row.createdAt.toISOString(),
      excerpt: row.excerpt,
      faqs: faqIds.map((id) => faqsById.get(id) ?? id),
      features: row.features,
      id: row.id,
      image: mediaFromMetadata(metadata, media, ['imageId', 'image']),
      meta: metaFor(seo.get(row.id), media),
      order: row.order,
      process: Array.isArray(metadata.process) ? metadata.process : [],
      relatedProjects: [],
      slug: row.slug,
      title: row.title,
      updatedAt: row.updatedAt.toISOString(),
    }
  })
}

async function listProjects(includeDrafts: boolean) {
  const [rows, seo, media, serviceDocs, clientDocs, testimonialDocs] = await Promise.all([
    db
      .select()
      .from(projects)
      .where(
        includeDrafts
          ? isNull(projects.deletedAt)
          : and(isNull(projects.deletedAt), nowFilters(projects.status)),
      )
      .orderBy(asc(projects.slug)),
    seoFor('project'),
    mediaById(),
    listServices(includeDrafts),
    listClients(),
    listTestimonials(),
  ])
  const servicesById = new Map(serviceDocs.map((service) => [service.id, service]))
  const clientsById = new Map(clientDocs.map((client) => [client.id, client]))
  const testimonialsById = new Map(
    testimonialDocs.map((testimonial) => [testimonial.id, testimonial]),
  )

  return rows.map((row) => {
    const metadata = record(row.metadata)
    const serviceIds = stringArray(metadata.serviceIds ?? metadata.services)
    const clientId = typeof metadata.clientId === 'string' ? metadata.clientId : null
    const testimonialId = typeof metadata.testimonialId === 'string' ? metadata.testimonialId : null

    return {
      ...metadata,
      _status: row.status,
      client: clientId ? (clientsById.get(clientId) ?? clientId) : (metadata.client ?? null),
      completedAt: row.completedAt,
      content: row.content,
      coverImage: mediaFromMetadata(metadata, media, ['coverImageId', 'imageId', 'coverImage']),
      createdAt: row.createdAt.toISOString(),
      excerpt: row.excerpt,
      gallery: Array.isArray(metadata.gallery) ? metadata.gallery : [],
      id: row.id,
      meta: metaFor(seo.get(row.id), media),
      results: Array.isArray(metadata.results) ? metadata.results : [],
      services: serviceIds.map((id) => servicesById.get(id) ?? id),
      slug: row.slug,
      stack: stringArray(metadata.stack),
      testimonial: testimonialId
        ? (testimonialsById.get(testimonialId) ?? testimonialId)
        : (metadata.testimonial ?? null),
      title: row.title,
      updatedAt: row.updatedAt.toISOString(),
    }
  })
}

async function listCategories() {
  const rows = await db.select().from(categories).where(isNull(categories.deletedAt))

  return rows.map((row) => ({
    createdAt: row.createdAt.toISOString(),
    description: row.description,
    id: row.id,
    slug: row.slug,
    title: row.title,
    updatedAt: row.updatedAt.toISOString(),
  }))
}

async function listTags() {
  const rows = await db.select().from(tags).where(isNull(tags.deletedAt))

  return rows.map((row) => ({
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    slug: row.slug,
    title: row.title,
    updatedAt: row.updatedAt.toISOString(),
  }))
}

async function listClients() {
  const [rows, media] = await Promise.all([
    db
      .select()
      .from(clients)
      .where(isNull(clients.deletedAt))
      .orderBy(asc(clients.order), asc(clients.name)),
    mediaById(),
  ])

  return rows.map((row) => {
    const metadata = record(row.metadata)
    return {
      ...metadata,
      createdAt: row.createdAt.toISOString(),
      id: row.id,
      logo:
        (row.logoId ? (media.get(row.logoId) ?? null) : null) ??
        mediaFromMetadata(metadata, media, ['logoId', 'logo']),
      name: row.name,
      order: row.order,
      updatedAt: row.updatedAt.toISOString(),
    }
  })
}

async function listTestimonials() {
  const [rows, media] = await Promise.all([
    db
      .select()
      .from(testimonials)
      .where(isNull(testimonials.deletedAt))
      .orderBy(asc(testimonials.order), asc(testimonials.authorName)),
    mediaById(),
  ])

  return rows.map((row) => {
    const metadata = record(row.metadata)
    return {
      ...metadata,
      authorName: row.authorName,
      authorRole: row.authorRole,
      avatar:
        (row.avatarId ? (media.get(row.avatarId) ?? null) : null) ??
        mediaFromMetadata(metadata, media, ['avatarId', 'avatar']),
      createdAt: row.createdAt.toISOString(),
      id: row.id,
      order: row.order,
      quote: row.quote,
      updatedAt: row.updatedAt.toISOString(),
    }
  })
}

async function listTeamMembers() {
  const [rows, media] = await Promise.all([
    db
      .select()
      .from(teamMembers)
      .where(isNull(teamMembers.deletedAt))
      .orderBy(asc(teamMembers.order), asc(teamMembers.name)),
    mediaById(),
  ])

  return rows.map((row) => {
    const metadata = record(row.metadata)
    return {
      ...metadata,
      bio: row.bio,
      createdAt: row.createdAt.toISOString(),
      id: row.id,
      name: row.name,
      order: row.order,
      photo:
        (row.photoId ? (media.get(row.photoId) ?? null) : null) ??
        mediaFromMetadata(metadata, media, ['photoId', 'photo']),
      role: row.role,
      updatedAt: row.updatedAt.toISOString(),
    }
  })
}

async function listFaqs() {
  const rows = await db
    .select()
    .from(faqs)
    .where(isNull(faqs.deletedAt))
    .orderBy(asc(faqs.order), asc(faqs.question))

  return rows.map((row) => ({
    answer: row.answer,
    category: row.category,
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    order: row.order,
    question: row.question,
    updatedAt: row.updatedAt.toISOString(),
    ...record(row.metadata),
  }))
}

async function categoriesByPost(postIds: string[]) {
  const map = new Map<string, Awaited<ReturnType<typeof listCategories>>>()
  if (postIds.length === 0) return map

  const rows = await db
    .select({
      createdAt: categories.createdAt,
      description: categories.description,
      id: categories.id,
      postId: postCategories.postId,
      slug: categories.slug,
      title: categories.title,
      updatedAt: categories.updatedAt,
    })
    .from(postCategories)
    .innerJoin(categories, eq(postCategories.categoryId, categories.id))
    .where(and(inArray(postCategories.postId, postIds), isNull(categories.deletedAt)))
    .orderBy(asc(postCategories.position), asc(categories.title))

  for (const row of rows) {
    const list = map.get(row.postId) ?? []
    list.push({
      createdAt: row.createdAt.toISOString(),
      description: row.description,
      id: row.id,
      slug: row.slug,
      title: row.title,
      updatedAt: row.updatedAt.toISOString(),
    })
    map.set(row.postId, list)
  }

  return map
}

async function tagsByPost(postIds: string[]) {
  const map = new Map<string, Awaited<ReturnType<typeof listTags>>>()
  if (postIds.length === 0) return map

  const rows = await db
    .select({
      createdAt: tags.createdAt,
      id: tags.id,
      postId: postTags.postId,
      slug: tags.slug,
      title: tags.title,
      updatedAt: tags.updatedAt,
    })
    .from(postTags)
    .innerJoin(tags, eq(postTags.tagId, tags.id))
    .where(and(inArray(postTags.postId, postIds), isNull(tags.deletedAt)))
    .orderBy(asc(tags.title))

  for (const row of rows) {
    const list = map.get(row.postId) ?? []
    list.push({
      createdAt: row.createdAt.toISOString(),
      id: row.id,
      slug: row.slug,
      title: row.title,
      updatedAt: row.updatedAt.toISOString(),
    })
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

async function listPosts(includeDrafts: boolean) {
  const now = new Date()
  const [rows, seo, media] = await Promise.all([
    db
      .select({
        authorDeletedAt: users.deletedAt,
        authorEmail: users.email,
        authorId: users.id,
        authorName: users.name,
        authorStatus: users.status,
        content: posts.content,
        coverImageId: posts.coverImageId,
        createdAt: posts.createdAt,
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
      .where(
        includeDrafts
          ? isNull(posts.deletedAt)
          : and(
              isNull(posts.deletedAt),
              or(
                eq(posts.status, 'published'),
                and(eq(posts.status, 'scheduled'), lte(posts.scheduledAt, now)),
              ),
            ),
      )
      .orderBy(asc(posts.slug)),
    seoFor('post'),
    mediaById(),
  ])
  const postIds = rows.map((row) => row.id)
  const [categoryMap, tagMap, relatedMap] = await Promise.all([
    categoriesByPost(postIds),
    tagsByPost(postIds),
    relatedIdsByPost(postIds),
  ])

  const docs = rows.map((row) => {
    const meta = metaFor(seo.get(row.id), media)
    const coverImage =
      (row.coverImageId ? (media.get(row.coverImageId) ?? null) : null) ?? meta?.image ?? null
    const author =
      row.authorId && row.authorStatus === 'active' && !row.authorDeletedAt
        ? {
            bio: null,
            id: row.authorId,
            name: row.authorName ?? row.authorEmail ?? 'Autor',
            photo: null,
            role: 'Autor',
          }
        : null

    return {
      _status: row.status,
      author,
      categories: categoryMap.get(row.id) ?? [],
      content: row.content,
      coverImage,
      createdAt: row.createdAt.toISOString(),
      excerpt: row.excerpt,
      id: row.id,
      meta,
      publishedAt: toIso(row.publishedAt),
      relatedPosts: [],
      scheduledAt: toIso(row.scheduledAt),
      slug: row.slug,
      tags: tagMap.get(row.id) ?? [],
      title: row.title,
      updatedAt: row.updatedAt.toISOString(),
    }
  })
  const docsById = new Map(docs.map((doc) => [doc.id, doc]))

  return docs.map((doc) => {
    const relatedPosts = (relatedMap.get(doc.id) ?? [])
      .map((id) => docsById.get(id))
      .filter((post): post is (typeof docs)[number] => Boolean(post))

    return { ...doc, relatedPosts }
  })
}

async function listLandings(includeDrafts: boolean, origin?: string) {
  const now = new Date()
  const [pageRows, faqDocs] = await Promise.all([
    db
      .select()
      .from(pages)
      .where(
        includeDrafts
          ? and(eq(pages.type, 'landing'), isNull(pages.deletedAt))
          : and(
              eq(pages.type, 'landing'),
              isNull(pages.deletedAt),
              or(
                eq(pages.status, 'published'),
                and(eq(pages.status, 'scheduled'), lte(pages.scheduledAt, now)),
              ),
            ),
      ),
    listFaqs(),
  ])
  const faqsById = new Map(faqDocs.map((faq) => [faq.id, faq]))

  const docs = []
  for (const page of pageRows) {
    const snapshot = await buildPageSnapshot(page.id, origin)
    const content = record(page.content)
    const faqIds = stringArray(content.faqIds ?? content.faqs)
    docs.push({
      _status: page.status,
      content: snapshot,
      excerpt: page.excerpt,
      faqs: faqIds.map((id) => faqsById.get(id) ?? id),
      id: page.id,
      meta: snapshot.seo,
      order: 0,
      service: null,
      slug: page.slug,
      title: page.title,
    })
  }

  return docs
}

async function listMedia() {
  const rows = await db
    .select()
    .from(mediaAssets)
    .where(and(eq(mediaAssets.status, 'active'), isNull(mediaAssets.deletedAt)))
    .orderBy(asc(mediaAssets.filename))

  return rows.map(mediaDoc)
}

async function listRedirectDocs() {
  const rows = await db
    .select()
    .from(redirects)
    .where(and(eq(redirects.active, true), isNull(redirects.deletedAt)))

  return rows.map((row) => ({
    from: row.fromPath,
    fromPath: row.fromPath,
    id: row.id,
    permanent: row.statusCode === 301,
    statusCode: row.statusCode,
    to: row.toPath,
    toPath: row.toPath,
  }))
}

async function collectionDocs(slug: CollectionSlug, includeDrafts: boolean, origin?: string) {
  if (slug === 'services') return listServices(includeDrafts)
  if (slug === 'projects') return listProjects(includeDrafts)
  if (slug === 'posts') return listPosts(includeDrafts)
  if (slug === 'categories') return listCategories()
  if (slug === 'tags') return listTags()
  if (slug === 'clients') return listClients()
  if (slug === 'testimonials') return listTestimonials()
  if (slug === 'team-members') return listTeamMembers()
  if (slug === 'faqs') return listFaqs()
  if (slug === 'landings') return listLandings(includeDrafts, origin)
  if (slug === 'media') return listMedia()
  if (slug === 'redirects') return listRedirectDocs()

  return []
}

export async function getCollectionResponse<TSlug extends CollectionSlug>(
  slug: TSlug,
  searchParams: URLSearchParams,
  input: { includeDrafts?: boolean; origin?: string } = {},
): Promise<PaginatedDocs<CollectionDoc<TSlug>>> {
  const limit = Number(getParam(searchParams, 'limit') ?? 10)
  const page = Number(getParam(searchParams, 'page') ?? 1)
  const sort = getParam(searchParams, 'sort')
  const docs = await collectionDocs(slug, input.includeDrafts ?? false, input.origin)
  const filtered = applyWhere(docs as AnyDoc[], searchParams)
  const sorted = sortDocs(filtered, sort)

  return paginate(sorted as unknown as CollectionDoc<TSlug>[], { limit, page })
}

async function settings(keys: string[]): Promise<Record<string, JsonRecord>> {
  const rows = await db.select().from(siteSettings).where(inArray(siteSettings.key, keys))
  const result: Record<string, JsonRecord> = {}
  for (const key of keys) result[key] = {}
  for (const row of rows) result[row.key] = record(row.value)
  return result
}

export async function getGlobalDoc<TSlug extends GlobalSlug>(
  slug: TSlug,
): Promise<GlobalDoc<TSlug>> {
  const [globals, media] = await Promise.all([
    settings(['site', 'brand', 'contact', 'social', 'cookies', 'scripts', 'header', 'footer']),
    mediaById(),
  ])
  const site = globals.site
  const brand = globals.brand
  const contact = globals.contact
  const social = globals.social
  const cookies = globals.cookies
  const scripts = globals.scripts

  if (slug === 'site-settings') {
    const defaultSeo = record(site.defaultSeo)
    const colors = record(brand.colors)

    return {
      address:
        (contact.address as string | undefined) ?? (site.address as string | undefined) ?? null,
      calendlyUrl:
        (contact.calendlyUrl as string | undefined) ??
        (site.calendlyUrl as string | undefined) ??
        null,
      colors,
      contactEmail:
        (contact.contactEmail as string | undefined) ??
        (site.contactEmail as string | undefined) ??
        null,
      cookieSettings: cookies,
      defaultSeo: {
        description:
          (defaultSeo.description as string | undefined) ??
          (site.defaultSeoDescription as string | undefined) ??
          (site.tagline as string | undefined) ??
          null,
        ogImage: mediaFromMetadata(defaultSeo, media, ['ogImageId', 'ogImage']),
        title:
          (defaultSeo.title as string | undefined) ??
          (site.defaultSeoTitle as string | undefined) ??
          (site.siteName as string | undefined) ??
          'ZiftLab',
      },
      externalScripts: Array.isArray(scripts.providers) ? (scripts.providers as never[]) : [],
      favicon: mediaFromMetadata(brand, media, ['faviconId', 'favicon']),
      hours: Array.isArray(contact.hours) ? (contact.hours as never[]) : [],
      logo: mediaFromMetadata(brand, media, ['logoId', 'logo']),
      phone: (contact.phone as string | undefined) ?? (site.phone as string | undefined) ?? null,
      siteName: (site.siteName as string | undefined) ?? 'ZiftLab',
      socialLinks: Array.isArray(social.links)
        ? (social.links as never[])
        : Array.isArray(site.socialLinks)
          ? (site.socialLinks as never[])
          : [],
      tagline: (site.tagline as string | undefined) ?? 'Tecnologia que vende',
      whatsapp:
        (contact.whatsapp as string | undefined) ?? (site.whatsapp as string | undefined) ?? null,
    } as GlobalDoc<TSlug>
  }

  if (slug === 'header') {
    const header = globals.header
    return {
      cta: record(header.cta).label
        ? record(header.cta)
        : { href: '/contacto', label: 'Hablemos', newTab: false },
      logo:
        mediaFromMetadata(header, media, ['logoId', 'logo']) ??
        mediaFromMetadata(brand, media, ['logoId', 'logo']),
      navItems: Array.isArray(header.navItems)
        ? (header.navItems as never[])
        : [
            { href: '/servicios', label: 'Servicios' },
            { href: '/portafolio', label: 'Portafolio' },
            { href: '/blog', label: 'Blog' },
            { href: '/quienes-somos', label: 'Quiénes somos' },
            { href: '/contacto', label: 'Contacto' },
          ],
    } as unknown as GlobalDoc<TSlug>
  }

  if (slug === 'footer') {
    const footer = globals.footer
    return {
      bottomText:
        (footer.bottomText as string | undefined) ??
        `© ${new Date().getFullYear()} ${(site.siteName as string | undefined) ?? 'ZiftLab'}. Todos los derechos reservados.`,
      columns: Array.isArray(footer.columns)
        ? (footer.columns as never[])
        : [
            {
              links: [
                { href: '/servicios', label: 'Servicios' },
                { href: '/portafolio', label: 'Portafolio' },
                { href: '/blog', label: 'Blog' },
              ],
              title: 'Sitio',
            },
            {
              links: [
                { href: '/contacto', label: 'Contacto' },
                { href: '/asesoria', label: 'Asesoría' },
                { href: '/cotizacion', label: 'Cotización' },
              ],
              title: 'Contacto',
            },
          ],
    } as GlobalDoc<TSlug>
  }

  if (slug === 'home-page') {
    return {
      hero: {
        eyebrow: 'ZiftLab',
        primaryCta: { href: '/contacto', label: 'Hablemos' },
        secondaryCta: { href: '/servicios', label: 'Ver servicios' },
        subtitle:
          (site.tagline as string | undefined) ??
          'Creamos sitios, automatizaciones y sistemas digitales para vender mejor.',
        title: (site.siteName as string | undefined) ?? 'ZiftLab',
      },
      meta: {
        description: (site.tagline as string | undefined) ?? null,
        title: (site.siteName as string | undefined) ?? 'ZiftLab',
      },
    } as GlobalDoc<TSlug>
  }

  if (slug === 'about-page') {
    return {
      ctaSection: {
        cta: { href: '/contacto', label: 'Hablemos' },
        text: 'Cuéntanos qué quieres construir y te ayudamos a ordenar el siguiente paso.',
        title: '¿Construimos algo juntos?',
      },
      intro: {
        eyebrow: 'Quiénes somos',
        text: 'Somos un equipo enfocado en convertir tecnología en crecimiento comercial.',
        title: 'Tecnología que vende',
      },
      values: [],
    } as unknown as GlobalDoc<TSlug>
  }

  return {
    text: 'Cuéntanos tu proyecto y te respondemos pronto.',
    title: 'Contacto',
  } as GlobalDoc<TSlug>
}

export function isCollectionSlug(value: string): value is CollectionSlug {
  return [
    'categories',
    'clients',
    'faqs',
    'landings',
    'media',
    'posts',
    'projects',
    'redirects',
    'services',
    'tags',
    'team-members',
    'testimonials',
  ].includes(value)
}

export function isGlobalSlug(value: string): value is GlobalSlug {
  return ['about-page', 'contact-page', 'footer', 'header', 'home-page', 'site-settings'].includes(
    value,
  )
}
