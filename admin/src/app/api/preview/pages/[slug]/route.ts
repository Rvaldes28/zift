import { db, pages } from '@ziftlab/db'
import { and, eq, isNull } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { buildPageSnapshot } from '@/lib/content/snapshots'

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

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!hasPreviewAccess(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const { slug } = await params
  const [page] = await db
    .select({ id: pages.id })
    .from(pages)
    .where(and(eq(pages.slug, slug), isNull(pages.deletedAt)))
    .limit(1)

  if (!page) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
  }

  return NextResponse.json({
    doc: await buildPageSnapshot(page.id, new URL(request.url).origin),
    ok: true,
  })
}
