import { NextResponse } from 'next/server'

import { getCollectionResponse, isCollectionSlug } from '@/lib/public-api/query'

export const runtime = 'nodejs'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ collection: string }> },
) {
  const { collection } = await params

  if (!isCollectionSlug(collection)) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
  }

  const url = new URL(request.url)
  const docs = await getCollectionResponse(collection, url.searchParams, {
    origin: url.origin,
  })

  return NextResponse.json(docs)
}
