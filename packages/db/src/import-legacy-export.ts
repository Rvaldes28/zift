import { readFile } from 'node:fs/promises'

import { eq } from 'drizzle-orm'

import { closeDb, db } from './client.js'
import {
  categories,
  clients,
  faqs,
  mediaAssets,
  pages,
  postCategories,
  posts,
  projects,
  redirects,
  seoMetadata,
  services,
  siteSettings,
  teamMembers,
  testimonials,
} from './schema.js'

type JsonRecord = Record<string, unknown>
type CollectionKey =
  | 'categories'
  | 'clients'
  | 'faqs'
  | 'landings'
  | 'media'
  | 'posts'
  | 'projects'
  | 'redirects'
  | 'services'
  | 'team-members'
  | 'testimonials'

const LEGACY_SOURCE = process.env.LEGACY_SOURCE?.trim() || 'legacy'

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {}
}

function docs(input: JsonRecord, key: CollectionKey): JsonRecord[] {
  const value = input[key]
  if (Array.isArray(value)) return value.map(record)
  const nested = record(value)
  return Array.isArray(nested.docs) ? nested.docs.map(record) : []
}

function globalDoc(input: JsonRecord, slug: string): JsonRecord {
  const globals = record(input.globals)
  return record(globals[slug] ?? input[slug])
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function nullableText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function int(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) return value
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value)
  return null
}

function legacyId(doc: JsonRecord): number | null {
  return int(doc.id)
}

function relationId(value: unknown): number | null {
  if (typeof value === 'object' && value !== null) return int((value as JsonRecord).id)
  return int(value)
}

function relationIds(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.map(relationId).filter((id): id is number => id !== null)
}

function slug(value: unknown, fallback: string): string {
  const raw = text(value, fallback)
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 220)
}

function status(doc: JsonRecord): string {
  return text(doc._status ?? doc.status, 'published')
}

function rich(value: unknown): JsonRecord {
  if (typeof value === 'string') return { html: value }
  return record(value)
}

function meta(doc: JsonRecord): JsonRecord {
  return record(doc.meta)
}

function mediaUrl(doc: JsonRecord): string {
  return text(doc.url, `/api/media/file/${text(doc.filename, `${legacyId(doc) ?? 'asset'}`)}`)
}

async function upsertSeo(
  entityType: string,
  entityId: string,
  value: JsonRecord,
  mediaMap: Map<number, string>,
) {
  if (Object.keys(value).length === 0) return
  const imageLegacy = relationId(value.image)
  const ogLegacy = relationId(value.ogImage)
  await db
    .insert(seoMetadata)
    .values({
      canonicalUrl: nullableText(value.canonicalUrl),
      description: nullableText(value.description),
      entityId,
      entityType,
      imageId: imageLegacy ? (mediaMap.get(imageLegacy) ?? null) : null,
      noindex: Boolean(value.noindex),
      ogDescription: nullableText(value.ogDescription),
      ogImageId: ogLegacy ? (mediaMap.get(ogLegacy) ?? null) : null,
      ogTitle: nullableText(value.ogTitle),
      robotsDirectives: Array.isArray(value.robotsDirectives)
        ? (value.robotsDirectives as string[])
        : [],
      schemaJsonLd: record(value.schemaJsonLd),
      sitemapInclude: value.sitemapInclude !== false,
      title: nullableText(value.title),
    })
    .onConflictDoUpdate({
      target: [seoMetadata.entityType, seoMetadata.entityId],
      set: {
        canonicalUrl: nullableText(value.canonicalUrl),
        description: nullableText(value.description),
        imageId: imageLegacy ? (mediaMap.get(imageLegacy) ?? null) : null,
        noindex: Boolean(value.noindex),
        ogDescription: nullableText(value.ogDescription),
        ogImageId: ogLegacy ? (mediaMap.get(ogLegacy) ?? null) : null,
        ogTitle: nullableText(value.ogTitle),
        robotsDirectives: Array.isArray(value.robotsDirectives)
          ? (value.robotsDirectives as string[])
          : [],
        schemaJsonLd: record(value.schemaJsonLd),
        sitemapInclude: value.sitemapInclude !== false,
        title: nullableText(value.title),
        updatedAt: new Date(),
      },
    })
}

async function importMedia(input: JsonRecord) {
  const map = new Map<number, string>()
  for (const doc of docs(input, 'media')) {
    const id = legacyId(doc)
    if (id === null) continue
    const [row] = await db
      .insert(mediaAssets)
      .values({
        alt: text(doc.alt, text(doc.filename, '')),
        bucket: nullableText(doc.bucket),
        caption: nullableText(doc.caption),
        filename: text(doc.filename, `media-${id}`),
        filesize: int(doc.filesize),
        height: int(doc.height),
        legacyId: id,
        legacySource: LEGACY_SOURCE,
        metadata: { legacy: doc },
        mimeType: nullableText(doc.mimeType),
        storageKey: nullableText(doc.storageKey),
        url: mediaUrl(doc),
        width: int(doc.width),
      })
      .onConflictDoUpdate({
        target: [mediaAssets.legacySource, mediaAssets.legacyId],
        set: {
          alt: text(doc.alt, text(doc.filename, '')),
          caption: nullableText(doc.caption),
          filename: text(doc.filename, `media-${id}`),
          filesize: int(doc.filesize),
          height: int(doc.height),
          metadata: { legacy: doc },
          mimeType: nullableText(doc.mimeType),
          updatedAt: new Date(),
          url: mediaUrl(doc),
          width: int(doc.width),
        },
      })
      .returning({ id: mediaAssets.id })
    map.set(id, row.id)
  }
  return map
}

async function importCategories(input: JsonRecord) {
  const map = new Map<number, string>()
  for (const doc of docs(input, 'categories')) {
    const id = legacyId(doc)
    if (id === null) continue
    const title = text(doc.title, `Categoria ${id}`)
    const [row] = await db
      .insert(categories)
      .values({
        description: nullableText(doc.description),
        legacyId: id,
        legacySource: LEGACY_SOURCE,
        slug: slug(doc.slug, title),
        title,
      })
      .onConflictDoUpdate({
        target: [categories.legacySource, categories.legacyId],
        set: {
          description: nullableText(doc.description),
          slug: slug(doc.slug, title),
          title,
          updatedAt: new Date(),
        },
      })
      .returning({ id: categories.id })
    map.set(id, row.id)
  }
  return map
}

async function importClients(input: JsonRecord, mediaMap: Map<number, string>) {
  const map = new Map<number, string>()
  for (const doc of docs(input, 'clients')) {
    const id = legacyId(doc)
    if (id === null) continue
    const [row] = await db
      .insert(clients)
      .values({
        legacyId: id,
        legacySource: LEGACY_SOURCE,
        logoId: relationId(doc.logo) ? (mediaMap.get(relationId(doc.logo)!) ?? null) : null,
        metadata: { legacy: doc },
        name: text(doc.name, `Cliente ${id}`),
        order: int(doc.order) ?? 0,
      })
      .onConflictDoUpdate({
        target: [clients.legacySource, clients.legacyId],
        set: {
          logoId: relationId(doc.logo) ? (mediaMap.get(relationId(doc.logo)!) ?? null) : null,
          metadata: { legacy: doc },
          name: text(doc.name, `Cliente ${id}`),
          order: int(doc.order) ?? 0,
          updatedAt: new Date(),
        },
      })
      .returning({ id: clients.id })
    map.set(id, row.id)
  }
  return map
}

async function importTestimonials(input: JsonRecord, mediaMap: Map<number, string>) {
  const map = new Map<number, string>()
  for (const doc of docs(input, 'testimonials')) {
    const id = legacyId(doc)
    if (id === null) continue
    const [row] = await db
      .insert(testimonials)
      .values({
        authorName: text(doc.authorName, text(doc.name, `Testimonio ${id}`)),
        authorRole: nullableText(doc.authorRole),
        avatarId: relationId(doc.avatar) ? (mediaMap.get(relationId(doc.avatar)!) ?? null) : null,
        legacyId: id,
        legacySource: LEGACY_SOURCE,
        metadata: { legacy: doc },
        order: int(doc.order) ?? 0,
        quote: text(doc.quote, ''),
      })
      .onConflictDoUpdate({
        target: [testimonials.legacySource, testimonials.legacyId],
        set: {
          authorName: text(doc.authorName, text(doc.name, `Testimonio ${id}`)),
          authorRole: nullableText(doc.authorRole),
          avatarId: relationId(doc.avatar) ? (mediaMap.get(relationId(doc.avatar)!) ?? null) : null,
          metadata: { legacy: doc },
          order: int(doc.order) ?? 0,
          quote: text(doc.quote, ''),
          updatedAt: new Date(),
        },
      })
      .returning({ id: testimonials.id })
    map.set(id, row.id)
  }
  return map
}

async function importTeam(input: JsonRecord, mediaMap: Map<number, string>) {
  const map = new Map<number, string>()
  for (const doc of docs(input, 'team-members')) {
    const id = legacyId(doc)
    if (id === null) continue
    const [row] = await db
      .insert(teamMembers)
      .values({
        bio: nullableText(doc.bio),
        legacyId: id,
        legacySource: LEGACY_SOURCE,
        metadata: { legacy: doc },
        name: text(doc.name, `Miembro ${id}`),
        order: int(doc.order) ?? 0,
        photoId: relationId(doc.photo) ? (mediaMap.get(relationId(doc.photo)!) ?? null) : null,
        role: nullableText(doc.role),
      })
      .onConflictDoUpdate({
        target: [teamMembers.legacySource, teamMembers.legacyId],
        set: {
          bio: nullableText(doc.bio),
          metadata: { legacy: doc },
          name: text(doc.name, `Miembro ${id}`),
          order: int(doc.order) ?? 0,
          photoId: relationId(doc.photo) ? (mediaMap.get(relationId(doc.photo)!) ?? null) : null,
          role: nullableText(doc.role),
          updatedAt: new Date(),
        },
      })
      .returning({ id: teamMembers.id })
    map.set(id, row.id)
  }
  return map
}

async function importFaqs(input: JsonRecord) {
  const map = new Map<number, string>()
  for (const doc of docs(input, 'faqs')) {
    const id = legacyId(doc)
    if (id === null) continue
    const [row] = await db
      .insert(faqs)
      .values({
        answer: rich(doc.answer),
        category: nullableText(doc.category),
        legacyId: id,
        legacySource: LEGACY_SOURCE,
        metadata: { legacy: doc },
        order: int(doc.order) ?? 0,
        question: text(doc.question, `FAQ ${id}`),
      })
      .onConflictDoUpdate({
        target: [faqs.legacySource, faqs.legacyId],
        set: {
          answer: rich(doc.answer),
          category: nullableText(doc.category),
          metadata: { legacy: doc },
          order: int(doc.order) ?? 0,
          question: text(doc.question, `FAQ ${id}`),
          updatedAt: new Date(),
        },
      })
      .returning({ id: faqs.id })
    map.set(id, row.id)
  }
  return map
}

async function importServices(
  input: JsonRecord,
  mediaMap: Map<number, string>,
  faqMap: Map<number, string>,
) {
  const map = new Map<number, string>()
  for (const doc of docs(input, 'services')) {
    const id = legacyId(doc)
    if (id === null) continue
    const title = text(doc.title, `Servicio ${id}`)
    const metadata = {
      benefits: doc.benefits,
      faqIds: relationIds(doc.faqs)
        .map((faqId) => faqMap.get(faqId))
        .filter(Boolean),
      imageId: relationId(doc.image) ? mediaMap.get(relationId(doc.image)!) : null,
      process: doc.process,
      legacy: doc,
    }
    const [row] = await db
      .insert(services)
      .values({
        content: rich(doc.content),
        excerpt: text(doc.excerpt, ''),
        features: Array.isArray(doc.features) ? (doc.features as JsonRecord[]) : [],
        legacyId: id,
        legacySource: LEGACY_SOURCE,
        metadata,
        order: int(doc.order) ?? 0,
        slug: slug(doc.slug, title),
        status: status(doc),
        title,
      })
      .onConflictDoUpdate({
        target: [services.legacySource, services.legacyId],
        set: {
          content: rich(doc.content),
          excerpt: text(doc.excerpt, ''),
          features: Array.isArray(doc.features) ? (doc.features as JsonRecord[]) : [],
          metadata,
          order: int(doc.order) ?? 0,
          slug: slug(doc.slug, title),
          status: status(doc),
          title,
          updatedAt: new Date(),
        },
      })
      .returning({ id: services.id })
    map.set(id, row.id)
    await upsertSeo('service', row.id, meta(doc), mediaMap)
  }
  return map
}

async function importProjects(
  input: JsonRecord,
  mediaMap: Map<number, string>,
  clientMap: Map<number, string>,
  serviceMap: Map<number, string>,
  testimonialMap: Map<number, string>,
) {
  const map = new Map<number, string>()
  for (const doc of docs(input, 'projects')) {
    const id = legacyId(doc)
    if (id === null) continue
    const title = text(doc.title, `Proyecto ${id}`)
    const metadata = {
      clientId: relationId(doc.client) ? clientMap.get(relationId(doc.client)!) : null,
      coverImageId: relationId(doc.coverImage) ? mediaMap.get(relationId(doc.coverImage)!) : null,
      gallery: doc.gallery,
      results: doc.results,
      serviceIds: relationIds(doc.services)
        .map((serviceId) => serviceMap.get(serviceId))
        .filter(Boolean),
      stack: doc.stack,
      testimonialId: relationId(doc.testimonial)
        ? testimonialMap.get(relationId(doc.testimonial)!)
        : null,
      legacy: doc,
    }
    const [row] = await db
      .insert(projects)
      .values({
        completedAt: nullableText(doc.completedAt),
        content: rich(doc.content),
        excerpt: text(doc.excerpt, ''),
        legacyId: id,
        legacySource: LEGACY_SOURCE,
        metadata,
        slug: slug(doc.slug, title),
        status: status(doc),
        title,
      })
      .onConflictDoUpdate({
        target: [projects.legacySource, projects.legacyId],
        set: {
          completedAt: nullableText(doc.completedAt),
          content: rich(doc.content),
          excerpt: text(doc.excerpt, ''),
          metadata,
          slug: slug(doc.slug, title),
          status: status(doc),
          title,
          updatedAt: new Date(),
        },
      })
      .returning({ id: projects.id })
    map.set(id, row.id)
    await upsertSeo('project', row.id, meta(doc), mediaMap)
  }
  return map
}

async function importPosts(
  input: JsonRecord,
  mediaMap: Map<number, string>,
  categoryMap: Map<number, string>,
) {
  const map = new Map<number, string>()
  for (const doc of docs(input, 'posts')) {
    const id = legacyId(doc)
    if (id === null) continue
    const title = text(doc.title, `Post ${id}`)
    const [row] = await db
      .insert(posts)
      .values({
        content: rich(doc.content),
        coverImageId: relationId(doc.coverImage)
          ? (mediaMap.get(relationId(doc.coverImage)!) ?? null)
          : null,
        excerpt: text(doc.excerpt, ''),
        legacyId: id,
        legacySource: LEGACY_SOURCE,
        publishedAt: nullableText(doc.publishedAt)
          ? new Date(nullableText(doc.publishedAt)!)
          : null,
        scheduledAt: nullableText(doc.scheduledAt)
          ? new Date(nullableText(doc.scheduledAt)!)
          : null,
        slug: slug(doc.slug, title),
        status: status(doc),
        title,
      })
      .onConflictDoUpdate({
        target: [posts.legacySource, posts.legacyId],
        set: {
          content: rich(doc.content),
          coverImageId: relationId(doc.coverImage)
            ? (mediaMap.get(relationId(doc.coverImage)!) ?? null)
            : null,
          excerpt: text(doc.excerpt, ''),
          publishedAt: nullableText(doc.publishedAt)
            ? new Date(nullableText(doc.publishedAt)!)
            : null,
          scheduledAt: nullableText(doc.scheduledAt)
            ? new Date(nullableText(doc.scheduledAt)!)
            : null,
          slug: slug(doc.slug, title),
          status: status(doc),
          title,
          updatedAt: new Date(),
        },
      })
      .returning({ id: posts.id })
    map.set(id, row.id)
    await upsertSeo('post', row.id, meta(doc), mediaMap)

    await db.delete(postCategories).where(eq(postCategories.postId, row.id))
    for (const [position, categoryId] of relationIds(doc.categories).entries()) {
      const mappedCategoryId = categoryMap.get(categoryId)
      if (!mappedCategoryId) continue
      await db
        .insert(postCategories)
        .values({ categoryId: mappedCategoryId, position, postId: row.id })
    }
  }
  return map
}

async function importPages(
  input: JsonRecord,
  mediaMap: Map<number, string>,
  faqMap: Map<number, string>,
) {
  const pageDocs = [
    { doc: globalDoc(input, 'home-page'), slug: 'home', title: 'Home', type: 'home' },
    {
      doc: globalDoc(input, 'about-page'),
      slug: 'quienes-somos',
      title: 'Quiénes somos',
      type: 'about',
    },
    { doc: globalDoc(input, 'contact-page'), slug: 'contacto', title: 'Contacto', type: 'contact' },
    ...docs(input, 'landings').map((doc) => ({
      doc,
      slug: slug(doc.slug, text(doc.title, 'landing')),
      title: text(doc.title, 'Landing'),
      type: 'landing',
    })),
  ].filter((item) => Object.keys(item.doc).length > 0)

  for (const item of pageDocs) {
    const legacy = legacyId(item.doc)
    const faqIds = relationIds(item.doc.faqs)
      .map((faqId) => faqMap.get(faqId))
      .filter(Boolean)
    const [row] = await db
      .insert(pages)
      .values({
        content: { ...item.doc, faqIds },
        excerpt: nullableText(item.doc.excerpt),
        legacyId: legacy,
        legacySource: legacy === null ? null : LEGACY_SOURCE,
        routePath: item.slug === 'home' ? '/' : `/${item.slug}`,
        slug: item.slug,
        status: status(item.doc),
        title: text(item.doc.title, item.title),
        type: item.type,
      })
      .onConflictDoUpdate({
        target: pages.slug,
        set: {
          content: { ...item.doc, faqIds },
          excerpt: nullableText(item.doc.excerpt),
          routePath: item.slug === 'home' ? '/' : `/${item.slug}`,
          status: status(item.doc),
          title: text(item.doc.title, item.title),
          type: item.type,
          updatedAt: new Date(),
        },
      })
      .returning({ id: pages.id })
    await upsertSeo('page', row.id, meta(item.doc), mediaMap)
  }
}

async function importRedirects(input: JsonRecord) {
  for (const doc of docs(input, 'redirects')) {
    const id = legacyId(doc)
    const fromPath = text(doc.fromPath ?? doc.from, '')
    const toPath = text(doc.toPath ?? doc.to, '')
    if (!fromPath || !toPath) continue
    await db
      .insert(redirects)
      .values({
        active: doc.active !== false,
        fromPath,
        legacyId: id,
        legacySource: id === null ? null : LEGACY_SOURCE,
        statusCode: int(doc.statusCode) ?? (doc.permanent === false ? 302 : 301),
        toPath,
      })
      .onConflictDoUpdate({
        target: redirects.fromPath,
        set: {
          active: doc.active !== false,
          statusCode: int(doc.statusCode) ?? (doc.permanent === false ? 302 : 301),
          toPath,
          updatedAt: new Date(),
        },
      })
  }
}

async function importSettings(input: JsonRecord) {
  const keys = ['site-settings', 'header', 'footer']
  for (const key of keys) {
    const value = globalDoc(input, key)
    if (Object.keys(value).length === 0) continue
    const settingKey = key === 'site-settings' ? 'site' : key
    await db
      .insert(siteSettings)
      .values({ key: settingKey, value })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: { updatedAt: new Date(), value },
      })
  }
}

async function main() {
  const file = process.env.LEGACY_EXPORT_FILE
  if (!file) throw new Error('LEGACY_EXPORT_FILE es requerido')

  const input = record(JSON.parse(await readFile(file, 'utf8')))
  const mediaMap = await importMedia(input)
  const categoryMap = await importCategories(input)
  const [clientMap, testimonialMap, teamMap, faqMap] = await Promise.all([
    importClients(input, mediaMap),
    importTestimonials(input, mediaMap),
    importTeam(input, mediaMap),
    importFaqs(input),
  ])
  const serviceMap = await importServices(input, mediaMap, faqMap)
  await importProjects(input, mediaMap, clientMap, serviceMap, testimonialMap)
  await importPosts(input, mediaMap, categoryMap)
  await importPages(input, mediaMap, faqMap)
  await importRedirects(input)
  await importSettings(input)

  console.info(
    JSON.stringify({
      categories: categoryMap.size,
      clients: clientMap.size,
      faqs: faqMap.size,
      media: mediaMap.size,
      services: serviceMap.size,
      teamMembers: teamMap.size,
      testimonials: testimonialMap.size,
    }),
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => {
    void closeDb()
  })
