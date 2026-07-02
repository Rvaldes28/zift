/**
 * Rate limiting en memoria para el endpoint público de leads (FASE 7).
 * Ventana deslizante por IP: suficiente para una instancia única (local o
 * VPS). Si el CMS escala horizontalmente, mover el contador a Redis.
 */

const WINDOW_MS = 10 * 60 * 1000 // 10 minutos
const MAX_PER_WINDOW = 8 // envíos por IP (holgado para oficinas tras NAT)
const PRUNE_AT = 5_000 // nº de IPs a partir del cual se poda el mapa

const hits = new Map<string, number[]>()

/** Registra un intento y devuelve true si la IP superó el límite. */
export function isRateLimited(key: string): boolean {
  const now = Date.now()
  const windowStart = now - WINDOW_MS

  const recent = (hits.get(key) ?? []).filter((timestamp) => timestamp > windowStart)
  const limited = recent.length >= MAX_PER_WINDOW
  if (!limited) recent.push(now)
  hits.set(key, recent)

  if (hits.size > PRUNE_AT) {
    for (const [ip, timestamps] of hits) {
      if (!timestamps.some((timestamp) => timestamp > windowStart)) hits.delete(ip)
    }
  }

  return limited
}
