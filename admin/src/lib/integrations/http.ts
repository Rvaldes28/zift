import 'server-only'

export interface IntegrationHttpResult {
  body: string
  ok: boolean
  status: number
}

export function safeJson(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

export function normalizedError(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

export function truncateBody(body: string, max = 2000): string {
  return body.length > max ? `${body.slice(0, max)}...` : body
}

export async function integrationFetch(
  url: string,
  init: RequestInit = {},
  maxBody = 2000,
): Promise<IntegrationHttpResult> {
  const response = await fetch(url, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(10_000),
  })
  const body = await response.text().catch(() => '')
  return {
    body: truncateBody(body, maxBody),
    ok: response.ok,
    status: response.status,
  }
}
