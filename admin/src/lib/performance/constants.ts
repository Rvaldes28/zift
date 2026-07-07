export const PERFORMANCE_RANGES = ['24h', '7d', '30d'] as const

export type PerformanceRangePreset = (typeof PERFORMANCE_RANGES)[number]

export const PERFORMANCE_RUM_EVENTS = [
  'web_vital',
  'resource_timing',
  'client_error',
  'api_timing',
  'form_error',
] as const

export type PerformanceRumEvent = (typeof PERFORMANCE_RUM_EVENTS)[number]

export const PERFORMANCE_THRESHOLDS = {
  apiResponseMs: 1500,
  cls: 0.1,
  heavyResourceBytes: 500 * 1024,
  inpMs: 200,
  lcpMs: 2500,
  syntheticResponseMs: 1500,
} as const

export const PERFORMANCE_EVENT_LABELS: Record<PerformanceRumEvent, string> = {
  api_timing: 'Tiempo API',
  client_error: 'Error cliente',
  form_error: 'Error formulario',
  resource_timing: 'Recurso pesado',
  web_vital: 'Web Vital',
}

export function performanceRangeLabel(range: PerformanceRangePreset): string {
  if (range === '24h') return 'Ultimas 24 horas'
  if (range === '7d') return 'Ultimos 7 dias'
  return 'Ultimos 30 dias'
}

export function normalizePerformanceRange(value: string | undefined): PerformanceRangePreset {
  return value === '24h' || value === '7d' ? value : '30d'
}
