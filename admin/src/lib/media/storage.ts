import 'server-only'

import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

function boolEnv(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim()
  if (!value) return fallback

  return value === 'true'
}

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, '')
}

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/g, '')
}

function encodeStorageKey(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/')
}

export function mediaConfig() {
  return {
    accessKeyId: process.env.S3_ACCESS_KEY_ID?.trim() || 'minioadmin',
    bucket: process.env.S3_BUCKET?.trim() || 'payload-media',
    endpoint: process.env.S3_ENDPOINT?.trim() || 'http://localhost:9000',
    forcePathStyle: boolEnv('S3_FORCE_PATH_STYLE', true),
    prefix: trimSlashes(process.env.S3_PREFIX?.trim() || 'admin-media'),
    publicBaseUrl: trimTrailingSlashes(process.env.S3_PUBLIC_BASE_URL?.trim() || ''),
    region: process.env.S3_REGION?.trim() || 'us-east-1',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY?.trim() || 'minioadmin',
  }
}

export function publicMediaUrl(storageKey: string): string {
  const config = mediaConfig()
  const encodedKey = encodeStorageKey(storageKey)

  if (config.publicBaseUrl) return `${config.publicBaseUrl}/${encodedKey}`

  return `/api/media/file/${encodedKey}`
}

export function createStorageKey(filename: string): string {
  const config = mediaConfig()
  const extension =
    filename
      .split('.')
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, '') || 'bin'

  return `${config.prefix}/${Date.now()}-${crypto.randomUUID()}.${extension}`
}

export function mediaClient() {
  const config = mediaConfig()

  return new S3Client({
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    region: config.region,
  })
}

export async function uploadMediaObject(input: { body: Buffer; contentType: string; key: string }) {
  const config = mediaConfig()
  const result = await mediaClient().send(
    new PutObjectCommand({
      Body: input.body,
      Bucket: config.bucket,
      ContentType: input.contentType,
      Key: input.key,
    }),
  )

  return {
    bucket: config.bucket,
    etag: result.ETag,
    url: publicMediaUrl(input.key),
  }
}

export async function getMediaObject(key: string) {
  const config = mediaConfig()

  return mediaClient().send(
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
  )
}
