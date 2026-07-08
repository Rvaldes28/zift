import { NextResponse } from 'next/server'

import { leadsToCsv } from '@/lib/leads/csv'
import { listLeadsForExport, parseLeadFilters } from '@/lib/leads/queries'
import { requirePermission, recordActivity } from '@/lib/rbac/access'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const current = await requirePermission('leads.read')

  const url = new URL(request.url)
  const filters = parseLeadFilters(url.searchParams)
  const rows = await listLeadsForExport(filters)
  const csv = leadsToCsv(rows)

  await recordActivity({
    action: 'lead.exported',
    actorId: current.user.id,
    entityType: 'lead',
    metadata: { count: rows.length, filters },
    severity: 'notice',
    source: 'admin',
  })

  return new NextResponse(csv, {
    headers: {
      'Content-Disposition': `attachment; filename="leads-ziftlab.csv"`,
      'Content-Type': 'text/csv; charset=utf-8',
    },
  })
}
