import { NextResponse } from 'next/server'

import { getBackupDownload } from '@/lib/backups/runner'
import { requirePermission, recordActivity } from '@/lib/rbac/access'

export const runtime = 'nodejs'

interface BackupDownloadRouteProps {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: BackupDownloadRouteProps) {
  const { id } = await params
  const current = await requirePermission('settings.manage')

  try {
    const { backup, body } = await getBackupDownload(id)
    await recordActivity({
      action: 'backup.downloaded',
      actorId: current.user.id,
      entityId: backup.id,
      entityType: 'backup',
      metadata: {
        filename: backup.filename,
        filesize: backup.filesize,
        scope: backup.scope,
      },
    })

    return new NextResponse(new Uint8Array(body), {
      headers: {
        'Content-Disposition': `attachment; filename="${backup.filename ?? `backup-${backup.id}.bin`}"`,
        'Content-Type': backup.mimeType ?? 'application/octet-stream',
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
