import 'server-only'

import type { AuditLogEvent } from './queries'

function actorLabel(event: AuditLogEvent): string {
  return event.actorName || event.actorEmail || 'Sistema'
}

function resourceLabel(event: AuditLogEvent): string {
  if (!event.entityType) return 'un recurso'
  if (event.entityId) return `${event.entityType}:${event.entityId}`
  return event.entityType
}

export function auditActionLabel(action: string): string {
  return action
    .replace(/\./g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

export function auditHumanSummary(event: AuditLogEvent): string {
  const actor = actorLabel(event)
  const date = event.createdAt.toLocaleString('es-PA', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
  const resource = resourceLabel(event)

  if (event.action.includes('published')) return `${actor} publico ${resource} el ${date}.`
  if (event.action.includes('login_failed'))
    return `${actor} intento iniciar sesion sin exito el ${date}.`
  if (event.action.includes('updated') || event.action.includes('changed')) {
    return `${actor} modifico ${resource} el ${date}.`
  }
  if (event.action.includes('created')) return `${actor} creo ${resource} el ${date}.`
  if (event.action.includes('deleted')) return `${actor} elimino ${resource} el ${date}.`
  if (event.action.includes('downloaded')) return `${actor} descargo ${resource} el ${date}.`
  if (event.action.includes('exported')) return `${actor} exporto ${resource} el ${date}.`

  return `${actor} ejecuto ${auditActionLabel(event.action)} sobre ${resource} el ${date}.`
}
