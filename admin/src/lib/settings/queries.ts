import 'server-only'

import { db, mediaAssets, pageSections, pages, siteSettings } from '@ziftlab/db'
import { and, asc, eq, inArray, isNull, or } from 'drizzle-orm'

import { listMediaAssets } from '@/lib/media/queries'

import {
  DEFAULT_COLORS,
  DEFAULT_COOKIE_SETTINGS,
  LEGAL_DOCUMENTS,
  SCRIPT_PROVIDERS,
} from './defaults'

export type JsonRecord = Record<string, unknown>

export interface SettingsDashboard {
  brand: JsonRecord
  contact: JsonRecord
  cookies: JsonRecord
  imageAssets: Awaited<ReturnType<typeof listMediaAssets>>
  legalDocuments: LegalDocumentState[]
  scripts: JsonRecord
  site: JsonRecord
  social: JsonRecord
}

export interface LegalDocumentState {
  description: string
  docNumber: number
  html: string
  id: string | null
  intro: string
  routePath: string
  sections: { id: string; label: string }[]
  slug: string
  status: string
  title: string
  updated: string
}

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {}
}

export async function getSettingValue(key: string): Promise<JsonRecord> {
  const row = await db.query.siteSettings.findFirst({ where: eq(siteSettings.key, key) })
  return record(row?.value)
}

export async function getSettingsMap(keys: string[]): Promise<Record<string, JsonRecord>> {
  const rows = await db.select().from(siteSettings).where(inArray(siteSettings.key, keys))
  const map: Record<string, JsonRecord> = {}
  for (const key of keys) map[key] = {}
  for (const row of rows) map[row.key] = record(row.value)
  return map
}

async function legalDocuments(): Promise<LegalDocumentState[]> {
  const rows = await db
    .select()
    .from(pages)
    .where(
      and(
        isNull(pages.deletedAt),
        or(
          ...LEGAL_DOCUMENTS.map((document) => eq(pages.slug, document.slug)),
          ...LEGAL_DOCUMENTS.map((document) => eq(pages.routePath, document.routePath)),
        )!,
      ),
    )
  const pageIds = rows.map((row) => row.id)
  const sections =
    pageIds.length > 0
      ? await db
          .select()
          .from(pageSections)
          .where(
            and(
              inArray(pageSections.pageId, pageIds),
              eq(pageSections.kind, 'legal_body'),
              isNull(pageSections.deletedAt),
            ),
          )
          .orderBy(asc(pageSections.position))
      : []

  return LEGAL_DOCUMENTS.map((document) => {
    const page = rows.find(
      (row) => row.slug === document.slug || row.routePath === document.routePath,
    )
    const section = page ? sections.find((row) => row.pageId === page.id) : null
    const data = record(section?.data)
    const storedSections = Array.isArray(data.sections)
      ? data.sections.filter(
          (item): item is { id: string; label: string } =>
            Boolean(item) &&
            typeof item === 'object' &&
            !Array.isArray(item) &&
            typeof (item as { id?: unknown }).id === 'string' &&
            typeof (item as { label?: unknown }).label === 'string',
        )
      : []

    return {
      description: typeof data.description === 'string' ? data.description : document.description,
      docNumber: document.docNumber,
      html: typeof data.html === 'string' ? data.html : '',
      id: page?.id ?? null,
      intro: typeof data.intro === 'string' ? data.intro : document.intro,
      routePath: document.routePath,
      sections: storedSections,
      slug: document.slug,
      status: page?.status ?? 'fallback',
      title: page?.title ?? document.title,
      updated:
        typeof data.updated === 'string' ? data.updated : new Date().toISOString().slice(0, 10),
    }
  })
}

export async function getSettingsDashboard(): Promise<SettingsDashboard> {
  const [settings, imageAssets, documents] = await Promise.all([
    getSettingsMap(['site', 'brand', 'contact', 'social', 'cookies', 'scripts']),
    listMediaAssets({ type: 'image' }),
    legalDocuments(),
  ])

  return {
    brand: { colors: DEFAULT_COLORS, ...settings.brand },
    contact: settings.contact,
    cookies: { ...DEFAULT_COOKIE_SETTINGS, ...settings.cookies },
    imageAssets,
    legalDocuments: documents,
    scripts: {
      providers: SCRIPT_PROVIDERS.map((provider) => ({
        ...provider,
        enabled: false,
        id: '',
      })),
      ...settings.scripts,
    },
    site: {
      siteName: 'ZiftLab',
      tagline: 'Tecnologia que vende',
      ...settings.site,
    },
    social: {
      links: [],
      ...settings.social,
    },
  }
}

export async function mediaRefById(id: unknown) {
  if (typeof id !== 'string' || !id) return null

  return db.query.mediaAssets.findFirst({
    where: and(
      eq(mediaAssets.id, id),
      eq(mediaAssets.status, 'active'),
      isNull(mediaAssets.deletedAt),
    ),
  })
}
