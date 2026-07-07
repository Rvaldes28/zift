import { NextResponse } from 'next/server'

import { getCollectionResponse, isCollectionSlug } from '@/lib/public-api/query'

export const runtime = 'nodejs'

function hasPreviewAccess(request: Request): boolean {
  const url = new URL(request.url)
  const configuredToken = process.env.ADMIN_PREVIEW_TOKEN?.trim()
  if (!configuredToken) return false

  const bearer = request.headers
    .get('authorization')
    ?.replace(/^Bearer\s+/i, '')
    .trim()
  const queryToken = url.searchParams.get('token')?.trim()

  return bearer === configuredToken || queryToken === configuredToken
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ collection: string }> },
) {
  if (!hasPreviewAccess(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const { collection } = await params
  if (!isCollectionSlug(collection)) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
  }

  const url = new URL(request.url)
  const docs = await getCollectionResponse(collection, url.searchParams, {
    includeDrafts: true,
    origin: url.origin,
  })

  return NextResponse.json(docs)
}
