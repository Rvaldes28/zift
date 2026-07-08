import 'server-only'

import { backupLogs, backups, db, pool, type Backup } from '@ziftlab/db'
import { eq } from 'drizzle-orm'

import { createDatabaseDump, restoreDatabaseDump } from './database'
import {
  backupFilename,
  backupObjectKey,
  normalizeBackupScope,
  type BackupScope,
  type BackupTrigger,
} from './config'
import {
  backupMediaObjects,
  readMediaManifest,
  restoreMediaManifest,
  type MediaBackupManifest,
} from './media'
import { getBackupObject, sha256, uploadBackupObject, type BackupObjectArtifact } from './storage'
import { recordAuditEvent } from '@/lib/audit/service'
import { createNotification } from '@/lib/notifications/service'

const BACKUP_LOCK_ID = 481516234

type BackupStatus = 'pending' | 'running' | 'completed' | 'failed' | 'restoring' | 'restored'

interface RunBackupInput {
  actorId: string | null
  restoreSourceId?: string | null
  scope: BackupScope
  trigger: BackupTrigger
}

interface RestoreBackupInput {
  actorId: string
  backupId: string
}

interface FullBackupManifest {
  backupId: string
  createdAt: string
  database: BackupObjectArtifact
  media: BackupObjectArtifact & { manifest: MediaBackupManifest }
  version: 1
}

function asJsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Error desconocido'
}

function jsonBuffer(value: unknown): Buffer {
  return Buffer.from(JSON.stringify(value, null, 2), 'utf8')
}

async function withBackupLock<T>(callback: () => Promise<T>): Promise<T> {
  const client = await pool.connect()

  try {
    const result = await client.query<{ locked: boolean }>(
      'select pg_try_advisory_lock($1) as locked',
      [BACKUP_LOCK_ID],
    )
    if (!result.rows[0]?.locked) {
      throw new Error('Ya hay un backup o restore en progreso')
    }

    return await callback()
  } finally {
    await client.query('select pg_advisory_unlock($1)', [BACKUP_LOCK_ID]).catch(() => null)
    client.release()
  }
}

async function recordBackupActivity(input: {
  action: string
  actorId: string | null
  backupId: string
  metadata?: Record<string, unknown>
}) {
  await recordAuditEvent({
    action: input.action,
    actorId: input.actorId,
    entityId: input.backupId,
    entityType: 'backup',
    metadata: input.metadata ?? {},
    severity: input.action.includes('failed') ? 'critical' : 'notice',
    source: 'backup',
  })
}

async function logBackup(
  backupId: string,
  level: 'info' | 'warning' | 'error',
  message: string,
  metadata: Record<string, unknown> = {},
) {
  await db.insert(backupLogs).values({
    backupId,
    level,
    message,
    metadata,
  })
}

async function updateBackup(backupId: string, values: Partial<typeof backups.$inferInsert>) {
  await db.update(backups).set(values).where(eq(backups.id, backupId))
}

async function createBackupRow(input: RunBackupInput): Promise<Backup> {
  const [row] = await db
    .insert(backups)
    .values({
      createdBy: input.actorId,
      kind: input.scope,
      restoreSourceId: input.restoreSourceId ?? null,
      scope: input.scope,
      status: 'running',
      trigger: input.trigger,
    })
    .returning()

  if (!row) throw new Error('No se pudo crear el registro de backup')
  return row
}

async function createDatabaseArtifact(
  backupId: string,
  log: typeof logBackup,
): Promise<BackupObjectArtifact> {
  await log(backupId, 'info', 'Creando dump PostgreSQL')
  const dump = await createDatabaseDump(backupId)
  const artifact = await uploadBackupObject({
    body: dump.body,
    contentType: 'application/octet-stream',
    filename: dump.filename,
    storageKey: backupObjectKey('database', backupId, dump.filename),
  })
  await log(backupId, 'info', 'Dump PostgreSQL guardado', {
    filesize: artifact.filesize,
    storageKey: artifact.storageKey,
  })
  return artifact
}

async function createFullArtifact(backupId: string): Promise<
  BackupObjectArtifact & {
    manifest: FullBackupManifest
  }
> {
  const database = await createDatabaseArtifact(backupId, logBackup)
  const media = await backupMediaObjects(backupId, (level, message, metadata) =>
    logBackup(backupId, level, message, metadata),
  )
  const manifest: FullBackupManifest = {
    backupId,
    createdAt: new Date().toISOString(),
    database,
    media,
    version: 1,
  }
  const filename = backupFilename('full', backupId, 'manifest.json')
  const artifact = await uploadBackupObject({
    body: jsonBuffer(manifest),
    contentType: 'application/json',
    filename,
    storageKey: backupObjectKey('full', backupId, filename),
  })

  await logBackup(backupId, 'info', 'Manifest full guardado', {
    storageKey: artifact.storageKey,
  })

  return { ...artifact, manifest }
}

function artifactMetadata(
  artifact: BackupObjectArtifact & { manifest?: unknown },
  extra: Record<string, unknown> = {},
) {
  return {
    ...extra,
    artifact: {
      bucket: artifact.bucket,
      checksum: artifact.checksum,
      filesize: artifact.filesize,
      location: artifact.location,
      mimeType: artifact.mimeType,
      storageKey: artifact.storageKey,
    },
  }
}

export async function runBackup(input: RunBackupInput): Promise<Backup> {
  return withBackupLock(async () => {
    const backup = await createBackupRow(input)

    await logBackup(backup.id, 'info', 'Backup iniciado', {
      scope: input.scope,
      trigger: input.trigger,
    })
    await recordBackupActivity({
      action: 'backup.started',
      actorId: input.actorId,
      backupId: backup.id,
      metadata: { scope: input.scope, trigger: input.trigger },
    })

    try {
      let artifact: BackupObjectArtifact
      let metadata: Record<string, unknown>

      if (input.scope === 'database') {
        artifact = await createDatabaseArtifact(backup.id, logBackup)
        metadata = artifactMetadata(artifact)
      } else if (input.scope === 'media') {
        const mediaArtifact = await backupMediaObjects(backup.id, (level, message, logMetadata) =>
          logBackup(backup.id, level, message, logMetadata),
        )
        artifact = mediaArtifact
        metadata = artifactMetadata(mediaArtifact, {
          failedObjects: mediaArtifact.manifest.failed.length,
          objects: mediaArtifact.manifest.objects.length,
        })
      } else {
        const fullArtifact = await createFullArtifact(backup.id)
        artifact = fullArtifact
        metadata = artifactMetadata(fullArtifact, {
          database: fullArtifact.manifest.database,
          media: {
            failedObjects: fullArtifact.manifest.media.manifest.failed.length,
            objects: fullArtifact.manifest.media.manifest.objects.length,
            storageKey: fullArtifact.manifest.media.storageKey,
          },
        })
      }

      const finishedAt = new Date()
      await updateBackup(backup.id, {
        bucket: artifact.bucket,
        checksum: artifact.checksum,
        filename: artifact.filename,
        filesize: artifact.filesize,
        finishedAt,
        location: artifact.location,
        metadata,
        mimeType: artifact.mimeType,
        status: 'completed',
        storageKey: artifact.storageKey,
      })
      await logBackup(backup.id, 'info', 'Backup completado')
      await recordBackupActivity({
        action: 'backup.completed',
        actorId: input.actorId,
        backupId: backup.id,
        metadata: { scope: input.scope },
      })

      return {
        ...backup,
        bucket: artifact.bucket,
        checksum: artifact.checksum,
        filename: artifact.filename,
        filesize: artifact.filesize,
        finishedAt,
        location: artifact.location,
        metadata,
        mimeType: artifact.mimeType,
        status: 'completed',
        storageKey: artifact.storageKey,
      }
    } catch (error) {
      const message = errorMessage(error)
      await updateBackup(backup.id, {
        errorMessage: message,
        finishedAt: new Date(),
        status: 'failed',
      }).catch(() => null)
      await logBackup(backup.id, 'error', 'Backup fallido', { error: message }).catch(() => null)
      await recordBackupActivity({
        action: 'backup.failed',
        actorId: input.actorId,
        backupId: backup.id,
        metadata: { error: message, scope: input.scope },
      }).catch(() => null)
      await createNotification({
        body: `Backup ${input.scope} fallido: ${message}`,
        dedupeKey: backup.id,
        entityId: backup.id,
        entityType: 'backup',
        eventType: 'backup.failed',
        metadata: { error: message, scope: input.scope, trigger: input.trigger },
        severity: 'critical',
        source: 'backups',
        title: 'Backup fallido',
      }).catch(() => null)
      throw error
    }
  })
}

function assertChecksum(body: Buffer, expectedChecksum: string | null): void {
  if (expectedChecksum && sha256(body) !== expectedChecksum) {
    throw new Error('Checksum invalido para el backup')
  }
}

async function getRestorableBackup(backupId: string): Promise<Backup> {
  const backup = await db.query.backups.findFirst({
    where: eq(backups.id, backupId),
  })
  if (!backup) throw new Error('Backup no encontrado')
  if (!backup.storageKey) throw new Error('Backup sin artefacto restaurable')
  if (backup.status !== 'completed' && backup.status !== 'restored') {
    throw new Error('Solo se pueden restaurar backups completados')
  }

  return backup
}

async function restoreDatabaseArtifact(
  backup: Pick<Backup, 'checksum' | 'storageKey'>,
): Promise<void> {
  if (!backup.storageKey) throw new Error('Backup sin dump PostgreSQL')
  const body = await getBackupObject(backup.storageKey)
  assertChecksum(body, backup.checksum)
  await restoreDatabaseDump(body)
}

async function restoreFullArtifact(backup: Backup, log: typeof logBackup): Promise<void> {
  if (!backup.storageKey) throw new Error('Backup full sin manifest')
  const body = await getBackupObject(backup.storageKey)
  assertChecksum(body, backup.checksum)
  const manifest = JSON.parse(body.toString('utf8')) as FullBackupManifest
  if (manifest.version !== 1 || !manifest.database?.storageKey || !manifest.media?.manifest) {
    throw new Error('Manifest full invalido')
  }

  const databaseBody = await getBackupObject(manifest.database.storageKey)
  assertChecksum(databaseBody, manifest.database.checksum)
  await restoreDatabaseDump(databaseBody)
  await restoreMediaManifest(manifest.media.manifest, (level, message, metadata) =>
    log(backup.id, level, message, metadata),
  )
}

export async function restoreBackup(input: RestoreBackupInput): Promise<void> {
  const backup = await getRestorableBackup(input.backupId)
  const scope = normalizeBackupScope(backup.scope)

  await runBackup({
    actorId: input.actorId,
    restoreSourceId: backup.id,
    scope,
    trigger: 'restore_guard',
  })

  await withBackupLock(async () => {
    await updateBackup(backup.id, {
      errorMessage: null,
      status: 'restoring' satisfies BackupStatus,
    })
    await logBackup(backup.id, 'warning', 'Restore iniciado', { scope })
    await recordBackupActivity({
      action: 'restore.started',
      actorId: input.actorId,
      backupId: backup.id,
      metadata: { scope },
    })

    try {
      if (scope === 'database') {
        await restoreDatabaseArtifact(backup)
      } else if (scope === 'media') {
        const manifest = await readMediaManifest(backup.storageKey!, backup.checksum)
        await restoreMediaManifest(manifest, (level, message, metadata) =>
          logBackup(backup.id, level, message, metadata),
        )
      } else {
        await restoreFullArtifact(backup, logBackup)
      }

      await updateBackup(backup.id, {
        restoredAt: new Date(),
        restoredBy: input.actorId,
        status: 'restored' satisfies BackupStatus,
      }).catch(() => null)
      await logBackup(backup.id, 'info', 'Restore completado').catch(() => null)
      await recordBackupActivity({
        action: 'restore.completed',
        actorId: input.actorId,
        backupId: backup.id,
        metadata: { scope },
      }).catch(() => null)
    } catch (error) {
      const message = errorMessage(error)
      await updateBackup(backup.id, {
        errorMessage: message,
        status: 'completed' satisfies BackupStatus,
      }).catch(() => null)
      await logBackup(backup.id, 'error', 'Restore fallido', { error: message }).catch(() => null)
      await recordBackupActivity({
        action: 'restore.failed',
        actorId: input.actorId,
        backupId: backup.id,
        metadata: { error: message, scope },
      }).catch(() => null)
      throw error
    }
  })
}

export async function getBackupDownload(backupId: string): Promise<{
  backup: Backup
  body: Buffer
}> {
  const backup = await getRestorableBackup(backupId)
  const body = await getBackupObject(backup.storageKey!)
  assertChecksum(body, backup.checksum)
  return { backup, body }
}

export function backupMetadata(value: Backup): Record<string, unknown> {
  return asJsonRecord(value.metadata)
}
