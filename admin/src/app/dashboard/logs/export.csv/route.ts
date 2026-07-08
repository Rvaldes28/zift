import { NextResponse } from 'next/server'

import { auditEventsToCsv, listAuditLogEvents, parseAuditFilters } from '@/lib/audit/queries'
import { requirePermission, recordActivity } from '@/lib/rbac/access'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const current = await requirePermission('audit.read')
  const url = new URL(request.url)
  const filters = parseAuditFilters(url.searchParams)
  const events = await listAuditLogEvents({ ...filters, limit: 500 })
  const csv = auditEventsToCsv(events)

  await recordActivity({
    action: 'audit.exported',
    actorId: current.user.id,
    entityType: 'audit',
    metadata: { count: events.length, filters },
    severity: 'notice',
    source: 'admin',
  })

  return new NextResponse(csv, {
    headers: {
      'Content-Disposition': `attachment; filename="audit-ziftlab.csv"`,
      'Content-Type': 'text/csv; charset=utf-8',
    },
  })
}
