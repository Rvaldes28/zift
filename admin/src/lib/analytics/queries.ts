import 'server-only'

import { analyticsEvents, db, leads } from '@ziftlab/db'
import { and, gte, isNull, lte } from 'drizzle-orm'

import { eventLabel, sourceLabel } from './constants'

export type AnalyticsRangePreset = '7d' | '30d' | '90d' | 'custom'

export interface AnalyticsFilters {
  dateFrom?: string
  dateTo?: string
  range?: string
}

export interface AnalyticsDashboard {
  averageDurationSeconds: number
  bounceRate: number
  browserRows: MetricRow[]
  cityRows: MetricRow[]
  conversionRate: number
  countryRows: MetricRow[]
  ctaRows: MetricRow[]
  dailyRows: DailyMetricRow[]
  deviceRows: MetricRow[]
  eventRows: MetricRow[]
  integrationRows: IntegrationRow[]
  leadStatusRows: MetricRow[]
  leads: number
  osRows: MetricRow[]
  pageViews: number
  range: { dateFrom: Date; dateTo: Date; label: string; preset: AnalyticsRangePreset }
  sessions: number
  sourceRows: MetricRow[]
}

export interface DailyMetricRow {
  date: string
  leads: number
  pageViews: number
}

export interface MetricRow {
  label: string
  value: number
}

export interface IntegrationRow {
  configured: boolean
  description: string
  label: string
}

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function endOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(23, 59, 59, 999)
  return copy
}

function parseDate(value: string | undefined, end = false): Date | null {
  if (!value) return null
  const date = new Date(`${value}T${end ? '23:59:59.999' : '00:00:00.000'}`)
  return Number.isNaN(date.valueOf()) ? null : date
}

export function parseAnalyticsFilters(input: AnalyticsFilters | undefined) {
  const range = input?.range === '90d' || input?.range === '7d' || input?.range === 'custom'
    ? input.range
    : '30d'
  const now = new Date()

  if (range === 'custom') {
    const customFrom = parseDate(input?.dateFrom)
    const customTo = parseDate(input?.dateTo, true)
    if (customFrom && customTo && customFrom <= customTo) {
      return {
        dateFrom: customFrom,
        dateTo: customTo,
        label: `${customFrom.toLocaleDateString('es-PA')} - ${customTo.toLocaleDateString('es-PA')}`,
        preset: 'custom' as const,
      }
    }
  }

  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30
  const dateTo = endOfDay(now)
  const dateFrom = startOfDay(new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000))

  return {
    dateFrom,
    dateTo,
    label: `Ultimos ${days} dias`,
    preset: range as AnalyticsRangePreset,
  }
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function increment(map: Map<string, number>, key: string | null | undefined, amount = 1) {
  const label = key?.trim() || 'Desconocido'
  map.set(label, (map.get(label) ?? 0) + amount)
}

function rowsFromMap(map: Map<string, number>, limit = 8): MetricRow[] {
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, limit)
}

function percent(value: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((value / total) * 1000) / 10
}

function integrationRows(): IntegrationRow[] {
  return [
    {
      configured: Boolean(process.env.PUBLIC_GA4_ID),
      description: 'Carga consent-gated desde la web. API Data pendiente.',
      label: 'Google Analytics 4',
    },
    {
      configured: Boolean(process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL),
      description: 'Estado preparado; consulta API queda para fase posterior.',
      label: 'Google Search Console',
    },
    {
      configured: Boolean(process.env.GOOGLE_ADS_CUSTOMER_ID),
      description: 'Solo estado de configuracion en esta fase.',
      label: 'Google Ads',
    },
    {
      configured: Boolean(process.env.PUBLIC_META_PIXEL_ID),
      description: 'Pixel no se inyecta todavia; queda visible como pendiente.',
      label: 'Meta Pixel',
    },
    {
      configured: Boolean(process.env.PUBLIC_CLARITY_ID),
      description: 'Carga consent-gated desde la web.',
      label: 'Microsoft Clarity',
    },
    {
      configured: Boolean(process.env.PUBLIC_HOTJAR_ID),
      description: 'No se inyecta todavia; preparado para fase posterior.',
      label: 'Hotjar',
    },
  ]
}

export async function getAnalyticsDashboard(
  input: AnalyticsFilters | undefined,
): Promise<AnalyticsDashboard> {
  const range = parseAnalyticsFilters(input)
  const [eventRows, leadRows] = await Promise.all([
    db
      .select()
      .from(analyticsEvents)
      .where(
        and(gte(analyticsEvents.occurredAt, range.dateFrom), lte(analyticsEvents.occurredAt, range.dateTo)),
      )
      .orderBy(analyticsEvents.occurredAt),
    db
      .select({
        analyticsSessionIdHash: leads.analyticsSessionIdHash,
        createdAt: leads.createdAt,
        deviceType: leads.deviceType,
        landingPath: leads.landingPath,
        source: leads.source,
        status: leads.status,
        utm: leads.utm,
      })
      .from(leads)
      .where(and(isNull(leads.deletedAt), gte(leads.createdAt, range.dateFrom), lte(leads.createdAt, range.dateTo))),
  ])

  const days = new Map<string, DailyMetricRow>()
  for (
    let cursor = startOfDay(range.dateFrom);
    cursor <= range.dateTo;
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
  ) {
    const key = dayKey(cursor)
    days.set(key, { date: key, leads: 0, pageViews: 0 })
  }

  const sourceMap = new Map<string, number>()
  const countryMap = new Map<string, number>()
  const cityMap = new Map<string, number>()
  const deviceMap = new Map<string, number>()
  const browserMap = new Map<string, number>()
  const osMap = new Map<string, number>()
  const eventMap = new Map<string, number>()
  const ctaMap = new Map<string, number>()
  const sessionPageViews = new Map<string, number>()
  const sessionConversions = new Set<string>()
  const engagementDurations: number[] = []

  for (const event of eventRows) {
    increment(eventMap, eventLabel(event.eventName))

    if (event.eventName === 'page_view') {
      const day = days.get(dayKey(event.occurredAt))
      if (day) day.pageViews += 1
      increment(sourceMap, sourceLabel(event.source))
      increment(countryMap, event.country)
      increment(cityMap, event.city)
      increment(deviceMap, event.deviceType)
      increment(browserMap, event.browser)
      increment(osMap, event.os)
      if (event.sessionIdHash) {
        sessionPageViews.set(event.sessionIdHash, (sessionPageViews.get(event.sessionIdHash) ?? 0) + 1)
      }
    }

    if (event.eventName === 'page_engagement' && event.durationMs) {
      engagementDurations.push(event.durationMs)
    }

    if (event.eventName === 'generate_lead' && event.sessionIdHash) {
      sessionConversions.add(event.sessionIdHash)
    }

    if (event.eventName === 'cta_click' || event.eventName === 'whatsapp_click') {
      const metadata = event.payload as Record<string, unknown>
      const label =
        typeof metadata.label === 'string'
          ? metadata.label
          : typeof metadata.location === 'string'
            ? metadata.location
            : event.eventName === 'whatsapp_click'
              ? 'WhatsApp'
              : 'CTA'
      increment(ctaMap, label)
    }
  }

  const leadStatusMap = new Map<string, number>()
  for (const lead of leadRows) {
    const day = days.get(dayKey(lead.createdAt))
    if (day) day.leads += 1
    increment(leadStatusMap, lead.status)
    if (lead.analyticsSessionIdHash) sessionConversions.add(lead.analyticsSessionIdHash)
  }

  const sessions = sessionPageViews.size
  const bounced = [...sessionPageViews.entries()].filter(
    ([sessionId, pageViews]) => pageViews <= 1 && !sessionConversions.has(sessionId),
  ).length
  const averageDurationMs =
    engagementDurations.length > 0
      ? engagementDurations.reduce((sum, value) => sum + value, 0) / engagementDurations.length
      : 0

  return {
    averageDurationSeconds: Math.round(averageDurationMs / 1000),
    bounceRate: percent(bounced, sessions),
    browserRows: rowsFromMap(browserMap),
    cityRows: rowsFromMap(cityMap),
    conversionRate: percent(leadRows.length, sessions),
    countryRows: rowsFromMap(countryMap),
    ctaRows: rowsFromMap(ctaMap),
    dailyRows: [...days.values()],
    deviceRows: rowsFromMap(deviceMap),
    eventRows: rowsFromMap(eventMap),
    integrationRows: integrationRows(),
    leadStatusRows: rowsFromMap(leadStatusMap),
    leads: leadRows.length,
    osRows: rowsFromMap(osMap),
    pageViews: eventRows.filter((event) => event.eventName === 'page_view').length,
    range,
    sessions,
    sourceRows: rowsFromMap(sourceMap),
  }
}
