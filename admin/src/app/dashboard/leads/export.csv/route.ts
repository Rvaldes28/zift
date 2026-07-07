import { NextResponse } from 'next/server'

import { leadsToCsv } from '@/lib/leads/csv'
import { listLeadsForExport, parseLeadFilters } from '@/lib/leads/queries'
import { requirePermission } from '@/lib/rbac/access'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  await requirePermission('leads.read')

  const url = new URL(request.url)
  const csv = leadsToCsv(await listLeadsForExport(parseLeadFilters(url.searchParams)))

  return new NextResponse(csv, {
    headers: {
      'Content-Disposition': `attachment; filename="leads-ziftlab.csv"`,
      'Content-Type': 'text/csv; charset=utf-8',
    },
  })
}
