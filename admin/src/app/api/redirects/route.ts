import { NextResponse } from 'next/server'

import { listPublicRedirects } from '@/lib/seo/queries'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 500) || 500, 1000)
  const redirects = await listPublicRedirects()
  const docs = redirects.slice(0, limit).map((redirect) => ({
    id: redirect.id,
    active: redirect.active,
    from: redirect.fromPath,
    fromPath: redirect.fromPath,
    permanent: redirect.statusCode === 301,
    statusCode: redirect.statusCode,
    to: redirect.toPath,
    toPath: redirect.toPath,
    updatedAt: redirect.updatedAt.toISOString(),
  }))

  return NextResponse.json({
    docs,
    hasNextPage: redirects.length > limit,
    hasPrevPage: false,
    limit,
    nextPage: null,
    page: 1,
    pagingCounter: 1,
    prevPage: null,
    totalDocs: redirects.length,
    totalPages: Math.max(1, Math.ceil(redirects.length / limit)),
  })
}
