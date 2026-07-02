import type { CollectionConfig } from 'payload'

import { authenticated, publishedOnly } from '../access'
import { slugField } from '../fields/slug'

export const Services: CollectionConfig = {
  slug: 'services',
  labels: {
    singular: 'Servicio',
    plural: 'Servicios',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'order', '_status'],
    group: 'Contenido',
  },
  versions: {
    drafts: true,
  },
  defaultSort: 'order',
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
      name: 'icon',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Icono pequeño para tarjetas',
      },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Imagen principal de la página del servicio',
      },
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
    },
    {
      name: 'features',
      type: 'array',
      label: 'Qué incluye',
      fields: [
        {
          name: 'text',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'benefits',
      type: 'array',
      label: 'Beneficios',
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'text',
          type: 'textarea',
        },
      ],
    },
    {
      name: 'process',
      type: 'array',
      label: 'Proceso',
      admin: {
        description: 'Secuencia real de trabajo — el frontend los numera en orden',
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'text',
          type: 'textarea',
        },
      ],
    },
    {
      name: 'relatedProjects',
      type: 'relationship',
      relationTo: 'projects',
      hasMany: true,
      label: 'Casos relacionados',
    },
    {
      name: 'faqs',
      type: 'relationship',
      relationTo: 'faqs',
      hasMany: true,
      label: 'Preguntas frecuentes',
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        description: 'Orden en listados (menor = primero)',
      },
    },
  ],
}
