import { NextResponse } from 'next/server'

import { getPublicPageBySlug } from '@/lib/content/queries'

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = await getPublicPageBySlug(slug, new URL(request.url).origin)

  if (!page) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, doc: page })
}
