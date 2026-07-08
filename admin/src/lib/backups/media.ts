import 'server-only'

import { db, mediaAssets } from '@ziftlab/db'
import { asc, isNotNull } from 'drizzle-orm'

import { mediaConfig } from '@/lib/media/storage'

import { backupFilename, backupObjectKey } from './config'
import {
  copyBackupObject,
  getBackupObject,
  sha256,
  uploadBackupObject,
  type BackupObjectArtifact,
} from './storage'

export interface MediaManifestObject {
  assetId: string
  backupStorageKey: string
  checksum: string | null
  filename: string
  storageKey: string
}

export interface MediaBackupManifest {
  backupId: string
  bucket: string
  createdAt: string
  failed: Array<{
    assetId: string
    error: string
    storageKey: string
  }>
  objects: MediaManifestObject[]
  prefix: string
  version: 1
}

type BackupLogger = (
  level: 'info' | 'warning' | 'error',
  message: string,
  metadata?: Record<string, unknown>,
) => Promise<void>

function jsonBuffer(value: unknown): Buffer {
  return Buffer.from(JSON.stringify(value, null, 2), 'utf8')
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Error desconocido'
}

export async function backupMediaObjects(
  backupId: string,
  log: BackupLogger,
): Promise<
  BackupObjectArtifact & {
    manifest: MediaBackupManifest
  }
> {
  const config = mediaConfig()
  const rows = await db
    .select({
      checksum: mediaAssets.checksum,
      filename: mediaAssets.filename,
      id: mediaAssets.id,
      storageKey: mediaAssets.storageKey,
    })
    .from(mediaAssets)
    .where(isNotNull(mediaAssets.storageKey))
    .orderBy(asc(mediaAssets.createdAt))

  const manifest: MediaBackupManifest = {
    backupId,
    bucket: config.bucket,
    createdAt: new Date().toISOString(),
    failed: [],
    objects: [],
    prefix: config.prefix,
    version: 1,
  }

  await log('info', 'Copiando objetos de media', { total: rows.length })

  for (const row of rows) {
    if (!row.storageKey) continue
    const backupStorageKey = backupObjectKey('media', backupId, `objects/${row.storageKey}`)

    try {
      await copyBackupObject({ fromKey: row.storageKey, toKey: backupStorageKey })
      manifest.objects.push({
        assetId: row.id,
        backupStorageKey,
        checksum: row.checksum,
        filename: row.filename,
        storageKey: row.storageKey,
      })
    } catch (error) {
      manifest.failed.push({
        assetId: row.id,
        error: errorMessage(error),
        storageKey: row.storageKey,
      })
      await log('warning', 'No se pudo copiar un objeto de media', {
        assetId: row.id,
        error: errorMessage(error),
        storageKey: row.storageKey,
      })
    }
  }

  const filename = backupFilename('media', backupId, 'manifest.json')
  const artifact = await uploadBackupObject({
    body: jsonBuffer(manifest),
    contentType: 'application/json',
    filename,
    storageKey: backupObjectKey('media', backupId, filename),
  })

  await log('info', 'Manifest de media guardado', {
    failed: manifest.failed.length,
    objects: manifest.objects.length,
    storageKey: artifact.storageKey,
  })

  return { ...artifact, manifest }
}

export async function readMediaManifest(
  storageKey: string,
  expectedChecksum?: string | null,
): Promise<MediaBackupManifest> {
  const body = await getBackupObject(storageKey)
  if (expectedChecksum && sha256(body) !== expectedChecksum) {
    throw new Error('Checksum invalido para el manifest de media')
  }

  const parsed = JSON.parse(body.toString('utf8')) as MediaBackupManifest
  if (parsed.version !== 1 || !Array.isArray(parsed.objects)) {
    throw new Error('Manifest de media invalido')
  }

  return parsed
}

export async function restoreMediaManifest(
  manifest: MediaBackupManifest,
  log: BackupLogger,
): Promise<{ failed: number; restored: number }> {
  let restored = 0
  let failed = 0

  await log('info', 'Restaurando objetos de media', { total: manifest.objects.length })

  for (const object of manifest.objects) {
    try {
      await copyBackupObject({ fromKey: object.backupStorageKey, toKey: object.storageKey })
      restored += 1
    } catch (error) {
      failed += 1
      await log('error', 'No se pudo restaurar un objeto de media', {
        error: errorMessage(error),
        storageKey: object.storageKey,
      })
    }
  }

  return { failed, restored }
}
