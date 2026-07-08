import 'server-only'

const REDACTED = '[REDACTED]'
const SENSITIVE_KEY_PATTERN =
  /(?:password|passphrase|token|secret|authorization|cookie|csrf|totp|recovery|api[_-]?key|private[_-]?key|webhook[_-]?secret|signature)/i

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)
  )
}

export function redactSecrets(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value
  if (typeof value === 'string') return value.length > 2000 ? `${value.slice(0, 2000)}...` : value
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (value instanceof Date) return value.toISOString()
  if (depth > 8) return '[Max depth]'

  if (Array.isArray(value)) {
    return value.slice(0, 100).map((item) => redactSecrets(item, depth + 1))
  }

  if (!isRecord(value)) return String(value)

  const output: Record<string, unknown> = {}
  for (const [key, nestedValue] of Object.entries(value)) {
    output[key] = SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : redactSecrets(nestedValue, depth + 1)
  }

  return output
}

export function redactRecord(value: Record<string, unknown> | null | undefined) {
  return (redactSecrets(value ?? {}) ?? {}) as Record<string, unknown>
}
