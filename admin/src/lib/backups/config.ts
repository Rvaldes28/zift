import 'server-only'

export const BACKUP_SCOPES = ['database', 'media', 'full'] as const
export const BACKUP_TRIGGERS = ['manual', 'scheduled', 'restore_guard'] as const

export type BackupScope = (typeof BACKUP_SCOPES)[number]
export type BackupTrigger = (typeof BACKUP_TRIGGERS)[number]

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, '')
}

function intEnv(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] ?? '', 10)
  return Number.isFinite(value) && value > 0 ? value : fallback
}

export function backupConfig() {
  return {
    autoCron: process.env.BACKUP_AUTO_CRON?.trim() || '0 3 * * *',
    autoEnabled: process.env.BACKUP_AUTO_ENABLED === 'true',
    cronSecret: process.env.BACKUP_CRON_SECRET?.trim() || '',
    prefix: trimSlashes(process.env.BACKUP_S3_PREFIX?.trim() || 'admin-backups'),
    retentionDays: intEnv('BACKUP_RETENTION_DAYS', 30),
  }
}

export function normalizeBackupScope(value: unknown): BackupScope {
  return BACKUP_SCOPES.includes(value as BackupScope) ? (value as BackupScope) : 'database'
}

export function backupFilename(scope: BackupScope, backupId: string, extension: string): string {
  return `ziftlab-${scope}-${backupId}.${extension}`
}

export function backupObjectKey(
  scope: BackupScope | 'database' | 'media' | 'full',
  backupId: string,
  filename: string,
) {
  const config = backupConfig()
  return `${config.prefix}/${scope}/${backupId}/${filename}`
}
