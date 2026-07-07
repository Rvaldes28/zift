import { ActivityLogList } from '@/components/dashboard/activity-log-list'
import { PageHeader } from '@/components/dashboard/ui'
import { requirePermission } from '@/lib/rbac/access'
import { listActivity } from '@/lib/users/queries'

export default async function ActivityPage() {
  await requirePermission('audit.read')
  const activity = await listActivity(120)

  return (
    <main className="px-6 py-8 lg:px-10">
      <PageHeader
        eyebrow="Auditoria"
        title="Actividad"
        description="Vista de compatibilidad para eventos administrativos. El menu principal usa Logs."
      />

      <div className="mt-8">
        <ActivityLogList activity={activity} />
      </div>
    </main>
  )
}
