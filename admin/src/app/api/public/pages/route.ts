import { NextResponse } from 'next/server'

import { listPublicPages } from '@/lib/content/queries'
import { pageTypeSchema } from '@/lib/content/types'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const type = url.searchParams.get('type')
  const parsedType = type ? pageTypeSchema.safeParse(type) : null

  const pages = await listPublicPages({
    type: parsedType?.success ? parsedType.data : undefined,
  })

  return NextResponse.json({ docs: pages })
}
