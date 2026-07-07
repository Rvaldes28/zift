import { getMediaAssetByStorageKey } from '@/lib/media/queries'
import { getMediaObject } from '@/lib/media/storage'

export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params
  const storageKey = key.join('/')
  const asset = await getMediaAssetByStorageKey(storageKey)

  if (!asset?.storageKey) {
    return new Response('Not found', { status: 404 })
  }

  const object = await getMediaObject(asset.storageKey)
  const body = object.Body

  if (!body) return new Response('Not found', { status: 404 })

  const bytes = await body.transformToByteArray()

  return new Response(bytes, {
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Length': String(bytes.byteLength),
      'Content-Type': asset.mimeType ?? object.ContentType ?? 'application/octet-stream',
    },
  })
}
