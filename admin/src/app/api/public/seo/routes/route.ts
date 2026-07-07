import { NextResponse } from 'next/server'

import { listPublicSeoRoutes } from '@/lib/seo/queries'

export async function GET() {
  const routes = await listPublicSeoRoutes()

  return NextResponse.json({ docs: routes, ok: true })
}
