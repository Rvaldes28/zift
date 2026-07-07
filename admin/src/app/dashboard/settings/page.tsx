import { ModulePlaceholder } from '@/components/dashboard/module-placeholder'
import { requirePermission } from '@/lib/rbac/access'

export default async function SettingsPage() {
  await requirePermission('settings.read')

  return (
    <ModulePlaceholder
      eyebrow="Sistema"
      title="Configuracion"
      description="Base para ajustes globales del dashboard y del sitio publico durante la migracion sin Payload."
      stats={[
        { label: 'Sitio', value: 'ZiftLab', helper: 'Seed inicial en site_settings.' },
        { label: 'Entorno', value: 'Admin', helper: 'Variables ADMIN_* separadas.' },
        {
          label: 'Compatibilidad',
          value: 'Temporal',
          helper: 'API compatible se conectara despues.',
        },
      ]}
      capabilities={[
        {
          label: 'Ajustes globales',
          description: 'Nombre del sitio, URLs publicas y defaults operativos.',
        },
        {
          label: 'Preferencias admin',
          description: 'Flags, comportamiento de modulos y configuracion segura.',
        },
        {
          label: 'Compatibilidad Astro',
          description: 'Puntos de control para mantener la web publica estable.',
        },
      ]}
      emptyMessage="La configuracion aun no tiene formularios editables. Esta pantalla queda lista para conectar site_settings."
    />
  )
}
