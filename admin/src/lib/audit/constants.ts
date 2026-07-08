export const AUDIT_SEVERITIES = ['info', 'notice', 'warning', 'critical'] as const

export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number]

export const auditSeverityLabel: Record<AuditSeverity, string> = {
  critical: 'Critico',
  info: 'Info',
  notice: 'Aviso',
  warning: 'Alerta',
}

export const auditSourceLabel: Record<string, string> = {
  admin: 'Dashboard',
  api: 'API',
  auth: 'Auth',
  backup: 'Backups',
  content: 'Contenido',
  integration: 'Integraciones',
  notification: 'Notificaciones',
  public: 'Web publica',
  security: 'Seguridad',
  system: 'Sistema',
}
