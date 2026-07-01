import type { CollectionConfig } from 'payload'

import { anyone, authenticated } from '../access'

export const Redirects: CollectionConfig = {
  slug: 'redirects',
  labels: {
    singular: 'Redirección',
    plural: 'Redirecciones',
  },
  admin: {
    useAsTitle: 'from',
    defaultColumns: ['from', 'to', 'permanent'],
    group: 'Configuración',
  },
  access: {
    read: anyone,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    {
      name: 'from',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      validate: (value: string | null | undefined) =>
        (typeof value === 'string' && value.startsWith('/')) ||
        'Debe ser una ruta interna que empiece con /',
      admin: {
        description: 'Ruta antigua, ej. /servicios-viejos',
      },
    },
    {
      name: 'to',
      type: 'text',
      required: true,
      admin: {
        description: 'Destino: ruta interna (/servicios) o URL externa',
      },
    },
    {
      name: 'permanent',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Activado = 301 (permanente), desactivado = 302 (temporal)',
      },
    },
  ],
}
