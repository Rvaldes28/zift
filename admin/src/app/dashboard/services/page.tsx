import { ModulePlaceholder } from '@/components/dashboard/module-placeholder'
import { requirePermission } from '@/lib/rbac/access'

export default async function ServicesPage() {
  await requirePermission('content.read')

  return (
    <ModulePlaceholder
      eyebrow="Contenido"
      title="Servicios"
      description="Modulo reservado para administrar el catalogo publico de servicios sin tocar Payload durante la transicion."
      stats={[
        { label: 'Publicacion', value: 'Borrador/Publicado', helper: 'Usara _status compatible.' },
        { label: 'SEO', value: 'Meta compatible', helper: 'title, description e imagen OG.' },
        { label: 'Relaciones', value: 'Preparado', helper: 'Proyectos, posts y landings futuras.' },
      ]}
      capabilities={[
        {
          label: 'Listado operativo',
          description: 'Busqueda, filtros por estado y orden publico.',
        },
        {
          label: 'Detalle editable',
          description: 'Slug, contenido, iconografia, CTA y metadata SEO.',
        },
        {
          label: 'API publica',
          description: 'Salida compatible con Astro mientras exista la capa de transicion.',
        },
      ]}
      emptyMessage="Aun no hay CRUD de servicios conectado. Esta pantalla deja la estructura lista para el modulo real."
    />
  )
}
