'use server'

import { db, pageSections, pages, siteSettings } from '@ziftlab/db'
import { and, eq, isNull, or } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { createPageVersion } from '@/lib/content/snapshots'
import { requirePermission, recordActivity } from '@/lib/rbac/access'
import { verifyCsrf } from '@/lib/security/csrf'
import { sanitizeHtml } from '@/lib/security/sanitize-html'

import {
  DEFAULT_COLORS,
  DEFAULT_COOKIE_SETTINGS,
  LEGAL_DOCUMENTS,
  SCRIPT_PROVIDERS,
  SOCIAL_PLATFORMS,
} from './defaults'
import { getSettingValue, mediaRefById, type JsonRecord } from './queries'

const hexSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/)
const urlSchema = z.string().url()
const emailSchema = z.string().email()

function formString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function nullableString(value: string): string | null {
  return value.length > 0 ? value : null
}

function settingsRedirect(tab: string, status = 'saved'): never {
  redirect(`/dashboard/settings?tab=${tab}&status=${status}`)
}

async function upsertSetting(key: string, value: JsonRecord) {
  const existing = await db.query.siteSettings.findFirst({ where: eq(siteSettings.key, key) })
  if (existing) {
    await db
      .update(siteSettings)
      .set({ updatedAt: new Date(), value })
      .where(eq(siteSettings.key, key))
    return
  }

  await db.insert(siteSettings).values({ key, value })
}

function validOptionalEmail(value: string): string | null {
  if (!value) return null
  const parsed = emailSchema.safeParse(value)
  if (!parsed.success) throw new Error('email')
  return parsed.data
}

function validOptionalUrl(value: string): string | null {
  if (!value) return null
  const parsed = urlSchema.safeParse(value)
  if (!parsed.success) throw new Error('url')
  return parsed.data
}

function parseHours(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split(':')
      return {
        label: label?.trim() || 'Horario',
        value: rest.join(':').trim() || '',
      }
    })
    .filter((item) => item.value)
}

function parseSocialLinks(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [platform, ...rest] = line.split(/\s+/)
      const url = rest.join(' ').trim()
      if (!platform || !SOCIAL_PLATFORMS.includes(platform as never)) throw new Error('social')
      if (!urlSchema.safeParse(url).success) throw new Error('social-url')
      return { platform, url }
    })
}

function extractLegalSections(html: string): { id: string; label: string }[] {
  const sections: { id: string; label: string }[] = []
  const pattern = /<h2[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/gi
  let match: RegExpExecArray | null

  while ((match = pattern.exec(html))) {
    const id = match[1]?.trim()
    const label = match[2]
      ?.replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (id && label) sections.push({ id, label })
  }

  return sections
}

async function ensureMedia(id: string | null) {
  if (!id) return null
  const asset = await mediaRefById(id)
  if (!asset) throw new Error('media')
  return id
}

async function recordSettingsActivity(actorId: string, action: string, metadata: JsonRecord = {}) {
  await recordActivity({
    action,
    actorId,
    entityType: 'site_settings',
    metadata,
  })
}

export async function updateGeneralSettings(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('settings.manage')
  const previousSite = await getSettingValue('site')

  try {
    const contact = {
      address: nullableString(formString(formData, 'address')),
      calendlyUrl: validOptionalUrl(formString(formData, 'calendlyUrl')),
      contactEmail: validOptionalEmail(formString(formData, 'contactEmail')),
      hours: parseHours(formString(formData, 'hours')),
      phone: nullableString(formString(formData, 'phone')),
      whatsapp: nullableString(formString(formData, 'whatsapp'))?.replace(/[^\d+]/g, '') ?? null,
    }
    const site = {
      ...previousSite,
      siteName: formString(formData, 'siteName') || 'ZiftLab',
      tagline: nullableString(formString(formData, 'tagline')),
    }

    await Promise.all([upsertSetting('site', site), upsertSetting('contact', contact)])
    await recordSettingsActivity(current.user.id, 'settings.general_updated', {
      siteName: site.siteName,
    })
  } catch {
    settingsRedirect('general', 'invalid')
  }

  revalidatePath('/dashboard/settings')
  settingsRedirect('general')
}

export async function updateBrandSettings(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('settings.manage')

  try {
    const colors = {
      accent: hexSchema.parse(formString(formData, 'accent') || DEFAULT_COLORS.accent),
      ink: hexSchema.parse(formString(formData, 'ink') || DEFAULT_COLORS.ink),
      paper: hexSchema.parse(formString(formData, 'paper') || DEFAULT_COLORS.paper),
      primary: hexSchema.parse(formString(formData, 'primary') || DEFAULT_COLORS.primary),
      primaryDark: hexSchema.parse(
        formString(formData, 'primaryDark') || DEFAULT_COLORS.primaryDark,
      ),
      primaryTint: hexSchema.parse(
        formString(formData, 'primaryTint') || DEFAULT_COLORS.primaryTint,
      ),
    }
    const logoId = await ensureMedia(nullableString(formString(formData, 'logoId')))
    const faviconId = await ensureMedia(nullableString(formString(formData, 'faviconId')))

    await upsertSetting('brand', { colors, faviconId, logoId })
    await recordSettingsActivity(current.user.id, 'settings.brand_updated', { faviconId, logoId })
  } catch {
    settingsRedirect('brand', 'invalid')
  }

  revalidatePath('/dashboard/settings')
  settingsRedirect('brand')
}

export async function updateSocialSettings(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('settings.manage')

  try {
    const links = parseSocialLinks(formString(formData, 'links'))
    await upsertSetting('social', { links })
    await recordSettingsActivity(current.user.id, 'settings.social_updated', {
      count: links.length,
    })
  } catch {
    settingsRedirect('social', 'invalid')
  }

  revalidatePath('/dashboard/settings')
  settingsRedirect('social')
}

export async function updateCookiesSettings(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('settings.manage')
  const value = {
    analyticsDescription:
      formString(formData, 'analyticsDescription') || DEFAULT_COOKIE_SETTINGS.analyticsDescription,
    analyticsLabel:
      formString(formData, 'analyticsLabel') || DEFAULT_COOKIE_SETTINGS.analyticsLabel,
    bannerText: formString(formData, 'bannerText') || DEFAULT_COOKIE_SETTINGS.bannerText,
    bannerTitle: formString(formData, 'bannerTitle') || DEFAULT_COOKIE_SETTINGS.bannerTitle,
    marketingDescription:
      formString(formData, 'marketingDescription') || DEFAULT_COOKIE_SETTINGS.marketingDescription,
    marketingLabel:
      formString(formData, 'marketingLabel') || DEFAULT_COOKIE_SETTINGS.marketingLabel,
    necessaryDescription:
      formString(formData, 'necessaryDescription') || DEFAULT_COOKIE_SETTINGS.necessaryDescription,
    updatedAt: new Date().toISOString(),
  }

  await upsertSetting('cookies', value)
  await recordSettingsActivity(current.user.id, 'settings.cookies_updated')
  revalidatePath('/dashboard/settings')
  settingsRedirect('cookies')
}

export async function updateScriptsSettings(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('settings.manage')
  const providers = SCRIPT_PROVIDERS.map((provider) => ({
    consentCategory: provider.consentCategory,
    enabled: formData.get(`${provider.provider}Enabled`) === 'on',
    id: nullableString(formString(formData, `${provider.provider}Id`)),
    label: provider.label,
    provider: provider.provider,
  }))

  await upsertSetting('scripts', { providers })
  await recordSettingsActivity(current.user.id, 'settings.scripts_updated', {
    enabled: providers.filter((provider) => provider.enabled).map((provider) => provider.provider),
  })
  revalidatePath('/dashboard/settings')
  settingsRedirect('scripts')
}

export async function saveLegalDocument(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('settings.manage')
  const slug = formString(formData, 'slug')
  const document = LEGAL_DOCUMENTS.find((item) => item.slug === slug)
  if (!document) settingsRedirect('legal', 'invalid')

  const status = formString(formData, 'status') === 'published' ? 'published' : 'draft'
  const title = formString(formData, 'title') || document.title
  const description = formString(formData, 'description') || document.description
  const intro = formString(formData, 'intro') || document.intro
  const updated = formString(formData, 'updated') || new Date().toISOString().slice(0, 10)
  const html = sanitizeHtml(formString(formData, 'html'))
  const sections = extractLegalSections(html)

  if (!html || sections.length === 0) settingsRedirect('legal', 'invalid')

  const [existing] = await db
    .select()
    .from(pages)
    .where(
      and(
        isNull(pages.deletedAt),
        or(eq(pages.slug, document.slug), eq(pages.routePath, document.routePath))!,
      ),
    )
    .limit(1)

  const page =
    existing ??
    (
      await db
        .insert(pages)
        .values({
          content: { legal: true },
          createdBy: current.user.id,
          excerpt: description,
          routePath: document.routePath,
          slug: document.slug,
          status: 'draft',
          title,
          type: 'legal',
          updatedBy: current.user.id,
        })
        .returning()
    )[0]

  await db
    .update(pages)
    .set({
      content: { legal: true },
      excerpt: description,
      routePath: document.routePath,
      slug: document.slug,
      status,
      title,
      type: 'legal',
      updatedAt: new Date(),
      updatedBy: current.user.id,
    })
    .where(eq(pages.id, page.id))

  const data = { description, docNumber: document.docNumber, html, intro, sections, updated }
  const existingSection = await db.query.pageSections.findFirst({
    where: and(
      eq(pageSections.pageId, page.id),
      eq(pageSections.kind, 'legal_body'),
      isNull(pageSections.deletedAt),
    ),
  })

  if (existingSection) {
    await db
      .update(pageSections)
      .set({
        data,
        enabled: true,
        label: title,
        position: 0,
        updatedAt: new Date(),
        updatedBy: current.user.id,
      })
      .where(eq(pageSections.id, existingSection.id))
  } else {
    await db.insert(pageSections).values({
      createdBy: current.user.id,
      data,
      enabled: true,
      kind: 'legal_body',
      label: title,
      pageId: page.id,
      position: 0,
      updatedBy: current.user.id,
    })
  }

  const version = await createPageVersion({ actorId: current.user.id, pageId: page.id })
  await db
    .update(pages)
    .set({
      currentVersionId: version.id,
      publishedAt: status === 'published' ? new Date() : page.publishedAt,
      publishedVersionId: status === 'published' ? version.id : page.publishedVersionId,
      status,
      updatedAt: new Date(),
      updatedBy: current.user.id,
    })
    .where(eq(pages.id, page.id))

  await recordSettingsActivity(current.user.id, `settings.legal_${status}`, {
    slug: document.slug,
    version: version.version,
  })
  revalidatePath('/dashboard/settings')
  settingsRedirect('legal', status === 'published' ? 'published' : 'saved')
}
