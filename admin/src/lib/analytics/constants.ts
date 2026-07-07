import { z } from 'zod'

export const ANALYTICS_EVENTS = [
  'page_view',
  'page_engagement',
  'cta_click',
  'whatsapp_click',
  'form_start',
  'generate_lead',
  'web_vital',
  'resource_timing',
  'client_error',
  'api_timing',
  'form_error',
] as const

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number]

export const analyticsEventNameSchema = z.enum(ANALYTICS_EVENTS)

export const SOURCE_LABELS: Record<string, string> = {
  ads: 'Anuncios',
  direct: 'Directo',
  google: 'Google',
  referral: 'Referido',
  social: 'Redes sociales',
  unknown: 'Desconocido',
}

export const EVENT_LABELS: Record<AnalyticsEventName, string> = {
  cta_click: 'Click CTA',
  form_start: 'Inicio formulario',
  generate_lead: 'Lead generado',
  page_engagement: 'Tiempo en pagina',
  page_view: 'Vista de pagina',
  api_timing: 'Tiempo API',
  client_error: 'Error cliente',
  form_error: 'Error formulario',
  resource_timing: 'Recurso pesado',
  web_vital: 'Web Vital',
  whatsapp_click: 'Click WhatsApp',
}

const SOCIAL_HOSTS = [
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  't.co',
  'twitter.com',
  'x.com',
  'youtube.com',
  'tiktok.com',
  'pinterest.com',
]

const AD_MEDIUMS = ['cpc', 'ppc', 'paid', 'paid_social', 'paid-search', 'display', 'ads']

function hostFromReferrer(referrer?: string | null): string | null {
  if (!referrer) return null

  try {
    return new URL(referrer).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return null
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export function normalizeTrafficSource(input: {
  referrer?: string | null
  source?: string | null
  utm?: Record<string, unknown> | null
}): string {
  const utmSource = text(input.utm?.source)
  const utmMedium = text(input.utm?.medium)
  const explicitSource = text(input.source)
  const referrerHost = hostFromReferrer(input.referrer)

  if (AD_MEDIUMS.includes(utmMedium) || explicitSource === 'ads') return 'ads'
  if (utmSource.includes('google') || explicitSource === 'google') return 'google'
  if (SOCIAL_HOSTS.some((host) => utmSource.includes(host.split('.')[0]))) return 'social'
  if (explicitSource && explicitSource !== 'direct') return explicitSource
  if (!referrerHost) return 'direct'
  if (referrerHost.includes('google.')) return 'google'
  if (SOCIAL_HOSTS.some((host) => referrerHost === host || referrerHost.endsWith(`.${host}`))) {
    return 'social'
  }

  return 'referral'
}

export function sourceLabel(source: string | null | undefined): string {
  return SOURCE_LABELS[source ?? 'unknown'] ?? source ?? SOURCE_LABELS.unknown
}

export function eventLabel(eventName: string): string {
  return EVENT_LABELS[eventName as AnalyticsEventName] ?? eventName
}
