'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { requirePermission, recordActivity } from '@/lib/rbac/access'
import { verifyCsrf } from '@/lib/security/csrf'

import { normalizeBackupScope } from './config'
import { restoreBackup, runBackup } from './runner'

function statusUrl(status: string, backupId?: string): string {
  const params = new URLSearchParams({ status })
  if (backupId) params.set('backup', backupId)
  return `/dashboard/backups?${params.toString()}`
}

export async function createBackupAction(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('settings.manage')
  const scope = normalizeBackupScope(formData.get('scope'))
  let createdBackupId: string | undefined

  try {
    const backup = await runBackup({
      actorId: current.user.id,
      scope,
      trigger: 'manual',
    })
    createdBackupId = backup.id
  } catch (error) {
    await recordActivity({
      action: 'backup.failed',
      actorId: current.user.id,
      entityType: 'backup',
      metadata: {
        error: error instanceof Error ? error.message : 'Error desconocido',
        scope,
      },
    }).catch(() => null)

    revalidatePath('/dashboard/backups')
    redirect(statusUrl('failed'))
  }

  revalidatePath('/dashboard/backups')
  redirect(statusUrl('created', createdBackupId))
}

export async function restoreBackupAction(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('settings.manage')
  const backupId = String(formData.get('backupId') ?? '')
  const confirmation = String(formData.get('confirmation') ?? '').trim()

  if (!backupId || confirmation !== 'RESTAURAR') {
    redirect(statusUrl('restore_invalid', backupId || undefined))
  }

  try {
    await restoreBackup({
      actorId: current.user.id,
      backupId,
    })
  } catch (error) {
    await recordActivity({
      action: 'restore.failed',
      actorId: current.user.id,
      entityId: backupId,
      entityType: 'backup',
      metadata: {
        error: error instanceof Error ? error.message : 'Error desconocido',
      },
    }).catch(() => null)

    revalidatePath('/dashboard/backups')
    revalidatePath(`/dashboard/backups/${backupId}`)
    redirect(statusUrl('restore_failed', backupId))
  }

  revalidatePath('/dashboard/backups')
  revalidatePath(`/dashboard/backups/${backupId}`)
  redirect(statusUrl('restored', backupId))
}
