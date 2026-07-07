'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { requirePermission, recordActivity } from '@/lib/rbac/access'
import { verifyCsrf } from '@/lib/security/csrf'

import { runPerformanceChecks } from './runner'

export async function runPerformanceChecksAction(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('performance.read')
  const result = await runPerformanceChecks()

  await recordActivity({
    action: 'performance.checks_run',
    actorId: current.user.id,
    entityType: 'performance_check',
    metadata: { failed: result.failed, total: result.total },
  })

  revalidatePath('/dashboard/performance')
  redirect(`/dashboard/performance?range=24h&checks=${result.failed > 0 ? 'warning' : 'ok'}`)
}
