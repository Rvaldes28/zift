import { NextResponse } from 'next/server'

import { getGlobalDoc, isGlobalSlug } from '@/lib/public-api/query'

export const runtime = 'nodejs'

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  if (!isGlobalSlug(slug)) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
  }

  return NextResponse.json(await getGlobalDoc(slug))
}
