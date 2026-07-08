import { timingSafeEqual } from 'crypto'

import { backupConfig, normalizeBackupScope } from '@/lib/backups/config'
import { runBackup } from '@/lib/backups/runner'

export const runtime = 'nodejs'

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

function requestSecret(request: Request): string {
  const authorization = request.headers.get('authorization') ?? ''
  if (authorization.startsWith('Bearer ')) return authorization.slice('Bearer '.length).trim()

  return request.headers.get('x-ziftlab-backup-secret')?.trim() ?? ''
}

export async function POST(request: Request) {
  const config = backupConfig()
  if (!config.cronSecret) {
    return Response.json(
      { ok: false, error: 'Backup cron secret is not configured' },
      { status: 503 },
    )
  }

  if (!config.autoEnabled) {
    return Response.json({ ok: false, error: 'Automatic backups are disabled' }, { status: 409 })
  }

  if (!safeEqual(requestSecret(request), config.cronSecret)) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const scope = normalizeBackupScope((body as { scope?: unknown }).scope ?? 'full')

  try {
    const backup = await runBackup({
      actorId: null,
      scope,
      trigger: 'scheduled',
    })

    return Response.json({
      backupId: backup.id,
      ok: true,
      scope,
      status: backup.status,
    })
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Backup failed',
        ok: false,
        scope,
      },
      { status: 500 },
    )
  }
}
