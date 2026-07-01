import type { CollectionConfig } from 'payload'

import { authenticated, publishedOnly } from '../access'
import { slugField } from '../fields/slug'

export const Projects: CollectionConfig = {
  slug: 'projects',
  labels: {
    singular: 'Proyecto',
    plural: 'Proyectos',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'client', 'completedAt', '_status'],
    group: 'Contenido',
  },
  versions: {
    drafts: true,
  },
  defaultSort: '-completedAt',
  access: {
    read: publishedOnly,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    slugField(),
    {
      name: 'excerpt',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Resumen corto para tarjetas y listados',
      },
    },
    {
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
    },
    {
      name: 'services',
      type: 'relationship',
      relationTo: 'services',
      hasMany: true,
      admin: {
        description: 'Servicios aplicados en este proyecto',
      },
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'gallery',
      type: 'array',
      label: 'Galería',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
    },
    {
      name: 'content',
      type: 'richText',
    },
    {
      name: 'externalUrl',
      type: 'text',
      admin: {
        description: 'URL del proyecto en producción (si es público)',
      },
    },
    {
      name: 'completedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        description: 'Fecha de entrega',
      },
    },
  ],
}
