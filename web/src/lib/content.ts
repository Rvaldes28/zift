import { CONTENT_API_URL } from './api'

export interface AdminMediaAsset {
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

export interface AdminPageSection {
  data: Record<string, unknown>
  enabled: boolean
  id: string
  kind: string
  label: string
  position: number
  settings: Record<string, unknown>
}

export interface AdminPublicPage {
  media: Record<string, AdminMediaAsset>
  page: {
    excerpt: string | null
    routePath: string
    slug: string
    title: string
    type: string
    updatedAt?: string
  }
  sections: AdminPageSection[]
  seo: {
    canonicalUrl?: string | null
    description?: string | null
    imageId?: string | null
    noindex?: boolean
    ogDescription?: string | null
    ogImageId?: string | null
    ogTitle?: string | null
    robotsDirectives?: string[]
    schemaJsonLd?: Record<string, unknown> | Record<string, unknown>[] | null
    sitemapInclude?: boolean
    title?: string | null
  } | null
}

export interface AdminPublicPageListItem {
  excerpt: string | null
  routePath: string
  slug: string
  title: string
  type: string
  updatedAt: string
}

const TIMEOUT_MS = 5000

async function contentFetch<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${CONTENT_API_URL}/api/public${path}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    if (response.status === 404) return null
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    return (await response.json()) as T
  } catch {
    return null
  }
}

export async function getAdminPage(slug: string): Promise<AdminPublicPage | null> {
  const response = await contentFetch<{ doc: AdminPublicPage; ok: true }>(
    `/pages/${encodeURIComponent(slug)}`,
  )

  return response?.doc ?? null
}

export async function getPreviewAdminPage(
  slug: string,
  token: string,
): Promise<AdminPublicPage | null> {
  const response = await fetch(
    `${CONTENT_API_URL}/api/preview/pages/${encodeURIComponent(slug)}?token=${encodeURIComponent(token)}`,
    {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  ).catch(() => null)

  if (!response?.ok) return null
  const body = (await response.json().catch(() => null)) as {
    doc?: AdminPublicPage
    ok?: boolean
  } | null

  return body?.ok ? (body.doc ?? null) : null
}

export async function listAdminPages(type?: string): Promise<AdminPublicPageListItem[]> {
  const query = type ? `?type=${encodeURIComponent(type)}` : ''
  const response = await contentFetch<{ docs: AdminPublicPageListItem[] }>(`/pages${query}`)

  return response?.docs ?? []
}

export function mediaById(page: AdminPublicPage | null, id: unknown): AdminMediaAsset | null {
  if (!page || typeof id !== 'string') return null

  return page.media[id] ?? null
}

export function seoImageUrl(page: AdminPublicPage | null): string | null {
  const seo = page?.seo
  if (!page || !seo) return null

  return mediaById(page, seo.ogImageId ?? seo.imageId)?.url ?? null
}

export function adminSeoProps(page: AdminPublicPage | null) {
  if (!page?.seo) return {}

  return {
    absoluteTitle: page.seo.title ?? undefined,
    canonicalUrl: page.seo.canonicalUrl ?? undefined,
    description: page.seo.description ?? undefined,
    noindex: page.seo.noindex ?? undefined,
    ogDescription: page.seo.ogDescription ?? undefined,
    ogImage: seoImageUrl(page),
    ogTitle: page.seo.ogTitle ?? undefined,
    robotsDirectives: page.seo.robotsDirectives ?? undefined,
    schemaJsonLd: page.seo.schemaJsonLd ?? undefined,
  }
}
