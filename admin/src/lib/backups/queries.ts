import 'server-only'

import { backupLogs, backups, db, users, type Backup, type BackupLog } from '@ziftlab/db'
import { desc, eq } from 'drizzle-orm'

import { backupConfig, normalizeBackupScope, type BackupScope } from './config'

export interface BackupListRow extends Backup {
  createdByName: string | null
}

export interface BackupOverview {
  autoCron: string
  autoEnabled: boolean
  failedCount: number
  lastSuccessfulBackup: Backup | null
  retentionDays: number
  runningCount: number
  rows: BackupListRow[]
  totalCount: number
}

export async function listBackups(limit = 50): Promise<BackupListRow[]> {
  return db
    .select({
      bucket: backups.bucket,
      checksum: backups.checksum,
      createdBy: backups.createdBy,
      createdByName: users.name,
      errorMessage: backups.errorMessage,
      filename: backups.filename,
      filesize: backups.filesize,
      finishedAt: backups.finishedAt,
      id: backups.id,
      kind: backups.kind,
      location: backups.location,
      metadata: backups.metadata,
      mimeType: backups.mimeType,
      restoredAt: backups.restoredAt,
      restoredBy: backups.restoredBy,
      restoreSourceId: backups.restoreSourceId,
      scope: backups.scope,
      startedAt: backups.startedAt,
      status: backups.status,
      storageKey: backups.storageKey,
      trigger: backups.trigger,
    })
    .from(backups)
    .leftJoin(users, eq(backups.createdBy, users.id))
    .orderBy(desc(backups.startedAt))
    .limit(limit)
}

export async function getBackupsOverview(): Promise<BackupOverview> {
  const rows = await listBackups()
  const config = backupConfig()

  return {
    autoCron: config.autoCron,
    autoEnabled: config.autoEnabled,
    failedCount: rows.filter((row) => row.status === 'failed').length,
    lastSuccessfulBackup:
      rows.find((row) => row.status === 'completed' || row.status === 'restored') ?? null,
    retentionDays: config.retentionDays,
    runningCount: rows.filter((row) => row.status === 'running' || row.status === 'restoring')
      .length,
    rows,
    totalCount: rows.length,
  }
}

export async function getBackupDetail(id: string): Promise<{
  backup: Backup | null
  logs: BackupLog[]
}> {
  const backup = await db.query.backups.findFirst({
    where: eq(backups.id, id),
  })

  if (!backup) return { backup: null, logs: [] }

  const logs = await db
    .select()
    .from(backupLogs)
    .where(eq(backupLogs.backupId, id))
    .orderBy(desc(backupLogs.createdAt))

  return { backup, logs }
}

export function backupScopeLabel(scope: string): string {
  const labels: Record<BackupScope, string> = {
    database: 'Base de datos',
    full: 'Completo',
    media: 'Media',
  }

  return labels[normalizeBackupScope(scope)] ?? scope
}

export function backupStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    completed: 'Completado',
    failed: 'Fallido',
    pending: 'Pendiente',
    restored: 'Restaurado',
    restoring: 'Restaurando',
    running: 'En progreso',
  }

  return labels[status] ?? status
}

export function backupTriggerLabel(trigger: string): string {
  const labels: Record<string, string> = {
    manual: 'Manual',
    restore_guard: 'Backup previo',
    scheduled: 'Automatico',
  }

  return labels[trigger] ?? trigger
}

export function formatBackupSize(value: number | null): string {
  if (!value) return 'Sin peso'
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`
  return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`
}
