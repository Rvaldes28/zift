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
      name: 'industry',
      label: 'Industria',
      type: 'text',
      admin: {
        description: 'Sector del cliente, ej. "Retail" o "Servicios legales"',
      },
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
      name: 'problem',
      label: 'Problema',
      type: 'textarea',
      admin: {
        description: 'Situación del cliente antes del proyecto (2–4 frases)',
      },
    },
    {
      name: 'solution',
      label: 'Solución',
      type: 'textarea',
      admin: {
        description: 'Qué se construyó y por qué (2–4 frases)',
      },
    },
    {
      name: 'stack',
      label: 'Stack',
      type: 'text',
      hasMany: true,
      admin: {
        description: 'Tecnologías usadas, ej. "Astro", "Payload CMS", "PostgreSQL"',
      },
    },
    {
      name: 'results',
      label: 'Resultados medibles',
      type: 'array',
      admin: {
        description: 'Métricas del caso; la primera se muestra en las tarjetas',
      },
      fields: [
        {
          name: 'value',
          type: 'text',
          required: true,
          admin: {
            description: 'Cifra corta, ej. "+42%" o "3×"',
          },
        },
        {
          name: 'label',
          type: 'text',
          required: true,
          admin: {
            description: 'Qué mide, ej. "ventas online"',
          },
        },
      ],
    },
    {
      name: 'testimonial',
      label: 'Testimonio relacionado',
      type: 'relationship',
      relationTo: 'testimonials',
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
