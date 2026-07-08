import 'server-only'

import { CopyObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { createHash } from 'crypto'

import { mediaClient, mediaConfig } from '@/lib/media/storage'

export interface BackupObjectArtifact {
  bucket: string
  checksum: string
  filesize: number
  filename: string
  location: string
  mimeType: string
  storageKey: string
}

function encodeCopySource(bucket: string, key: string): string {
  return `${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`
}

export function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

export function s3Location(bucket: string, key: string): string {
  return `s3://${bucket}/${key}`
}

export async function uploadBackupObject(input: {
  body: Buffer
  contentType: string
  filename: string
  storageKey: string
}): Promise<BackupObjectArtifact> {
  const config = mediaConfig()

  await mediaClient().send(
    new PutObjectCommand({
      Body: input.body,
      Bucket: config.bucket,
      ContentType: input.contentType,
      Key: input.storageKey,
    }),
  )

  return {
    bucket: config.bucket,
    checksum: sha256(input.body),
    filesize: input.body.byteLength,
    filename: input.filename,
    location: s3Location(config.bucket, input.storageKey),
    mimeType: input.contentType,
    storageKey: input.storageKey,
  }
}

export async function getBackupObject(storageKey: string): Promise<Buffer> {
  const config = mediaConfig()
  const result = await mediaClient().send(
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: storageKey,
    }),
  )

  if (!result.Body) throw new Error('Backup object is empty')
  return Buffer.from(await result.Body.transformToByteArray())
}

export async function copyBackupObject(input: { fromKey: string; toKey: string }): Promise<void> {
  const config = mediaConfig()

  await mediaClient().send(
    new CopyObjectCommand({
      Bucket: config.bucket,
      CopySource: encodeCopySource(config.bucket, input.fromKey),
      Key: input.toKey,
    }),
  )
}
