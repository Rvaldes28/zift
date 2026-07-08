import 'server-only'

export const NOTIFICATION_CHANNELS = [
  'dashboard',
  'email',
  'slack',
  'telegram',
  'whatsapp',
  'push',
] as const

export const NOTIFICATION_SEVERITIES = ['info', 'warning', 'critical'] as const
export const NOTIFICATION_STATUSES = ['open', 'acknowledged', 'resolved'] as const

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]
export type NotificationSeverity = (typeof NOTIFICATION_SEVERITIES)[number]
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number]

export const EVENT_LABELS: Record<string, string> = {
  'backup.failed': 'Backup fallido',
  'form.error': 'Formulario con error',
  'lead.created': 'Nuevo lead recibido',
  'order.created': 'Nuevo pedido',
  'payment.received': 'Pago recibido',
  'performance.slow': 'Baja velocidad del sitio',
  'security.suspicious_login': 'Intento sospechoso de login',
  'site.down': 'Pagina caida',
  'system.error': 'Error del sistema',
}

export function channelLabel(channel: string): string {
  const labels: Record<string, string> = {
    dashboard: 'Dashboard',
    email: 'Email',
    push: 'Push',
    slack: 'Slack',
    telegram: 'Telegram',
    whatsapp: 'WhatsApp',
  }
  return labels[channel] ?? channel
}

export function severityLabel(severity: string): string {
  const labels: Record<string, string> = {
    critical: 'Critica',
    info: 'Info',
    warning: 'Warning',
  }
  return labels[severity] ?? severity
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    acknowledged: 'Reconocida',
    open: 'Abierta',
    resolved: 'Resuelta',
  }
  return labels[status] ?? status
}
