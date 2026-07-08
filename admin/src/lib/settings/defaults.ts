import 'server-only'

export const SOCIAL_PLATFORMS = [
  'linkedin',
  'instagram',
  'facebook',
  'x',
  'tiktok',
  'youtube',
  'github',
  'other',
] as const

export const SCRIPT_PROVIDERS = [
  { consentCategory: 'analytics', label: 'Google Analytics 4', provider: 'ga4' },
  { consentCategory: 'analytics', label: 'Google Tag Manager', provider: 'gtm' },
  { consentCategory: 'analytics', label: 'Microsoft Clarity', provider: 'clarity' },
  { consentCategory: 'marketing', label: 'Google Ads', provider: 'google_ads' },
  { consentCategory: 'marketing', label: 'Meta Pixel', provider: 'meta_pixel' },
  { consentCategory: 'analytics', label: 'Hotjar', provider: 'hotjar' },
] as const

export const LEGAL_DOCUMENTS = [
  {
    description:
      'Qué datos personales trata ZiftLab, para qué, con qué base legal y cómo ejercer tus derechos.',
    docNumber: 1,
    intro:
      'Tratamos pocos datos, con un fin claro: responderte y trabajar contigo. Aquí está todo, sin letra pequeña.',
    routePath: '/privacidad',
    slug: 'privacidad',
    title: 'Política de privacidad',
  },
  {
    description:
      'Condiciones de uso del sitio de ZiftLab: titularidad, propiedad intelectual, propuestas comerciales y responsabilidad.',
    docNumber: 2,
    intro:
      'Estas condiciones explican cómo usar este sitio y cómo trabajamos cuando nos contactas.',
    routePath: '/terminos',
    slug: 'terminos',
    title: 'Términos y condiciones',
  },
  {
    description:
      'Qué cookies usa el sitio de ZiftLab, para qué sirven y cómo aceptarlas, rechazarlas o cambiar tu decisión.',
    docNumber: 3,
    intro:
      'Lo que no es necesario queda bloqueado hasta que tú digas lo contrario. Esta página explica qué hay detrás de cada opción.',
    routePath: '/cookies',
    slug: 'cookies',
    title: 'Política de cookies',
  },
] as const

export const DEFAULT_COOKIE_SETTINGS = {
  analyticsDescription: 'Nos dice qué páginas funcionan (Google Analytics, Clarity).',
  analyticsLabel: 'Analítica',
  bannerText:
    'Usamos cookies propias y de terceros para medir cómo se usa la web y, solo si algún día activas marketing, para publicidad.',
  bannerTitle: 'Cookies',
  marketingDescription: 'Publicidad y remarketing. Hoy no usamos ninguna.',
  marketingLabel: 'Marketing',
  necessaryDescription: 'Seguridad del sitio y recordar esta elección.',
}

export const DEFAULT_COLORS = {
  accent: '#9d93ff',
  ink: '#14161c',
  paper: '#fcfcfd',
  primary: '#4633ff',
  primaryDark: '#3524e0',
  primaryTint: '#edebff',
}

export type ScriptProviderSlug = (typeof SCRIPT_PROVIDERS)[number]['provider']
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]
