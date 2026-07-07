import { ModulePlaceholder } from '@/components/dashboard/module-placeholder'
import { requirePermission } from '@/lib/rbac/access'

export default async function IntegrationsPage() {
  await requirePermission('settings.read')

  return (
    <ModulePlaceholder
      eyebrow="Sistema"
      title="Integraciones"
      description="Panel futuro para revisar servicios externos sin exponer secretos ni depender de Payload."
      stats={[
        { label: 'Email', value: 'Resend', helper: 'Configuracion historica por migrar.' },
        { label: 'Media', value: 'S3/MinIO', helper: 'Compatibilidad de URLs pendiente.' },
        { label: 'Calendario', value: 'Calendly', helper: 'Usado por asesoria cuando aplica.' },
      ]}
      capabilities={[
        {
          label: 'Estado de servicios',
          description: 'Checks de conexion y ultimos errores por integracion.',
        },
        {
          label: 'Configuracion segura',
          description: 'Lectura de estado sin mostrar valores secretos.',
        },
        {
          label: 'Historial',
          description: 'Actividad y cambios de integraciones auditables.',
        },
      ]}
      emptyMessage="No hay integraciones conectadas desde el dashboard todavia. La UI queda preparada para la fase operativa."
    />
  )
}
