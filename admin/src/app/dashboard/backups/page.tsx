import { ModulePlaceholder } from '@/components/dashboard/module-placeholder'
import { requirePermission } from '@/lib/rbac/access'

export default async function BackupsPage() {
  await requirePermission('settings.read')

  return (
    <ModulePlaceholder
      eyebrow="Sistema"
      title="Backups"
      description="Area reservada para respaldos, restauraciones controladas y trazabilidad de archivos criticos."
      stats={[
        { label: 'DB admin', value: 'Separada', helper: 'ziftlab_admin_dev no toca Payload.' },
        { label: 'Media', value: 'Pendiente', helper: 'Estrategia S3/MinIO futura.' },
        { label: 'Restore', value: 'No activo', helper: 'Sin acciones destructivas en FASE 5.' },
      ]}
      capabilities={[
        {
          label: 'Backups programados',
          description: 'Inventario de snapshots de PostgreSQL y objetos media.',
        },
        {
          label: 'Verificacion',
          description: 'Checks de integridad y antiguedad de respaldos.',
        },
        {
          label: 'Restauracion guiada',
          description: 'Flujo futuro con confirmaciones, auditoria y rollback.',
        },
      ]}
      emptyMessage="No se crean ni restauran backups desde esta fase. Solo se prepara la experiencia administrativa."
    />
  )
}
