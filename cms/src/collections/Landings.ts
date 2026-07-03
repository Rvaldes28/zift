import type { CollectionConfig } from 'payload'

import { authenticated, publishedOnly } from '../access'
import { slugField } from '../fields/slug'

export const Landings: CollectionConfig = {
  slug: 'landings',
  labels: {
    singular: 'Landing SEO',
    plural: 'Landings SEO',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'order', '_status'],
    group: 'Contenido',
    description:
      'Páginas de aterrizaje para SEO local (FASE 8). Se publican en la raíz del sitio: /desarrollo-web-panama',
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
      admin: {
        description: 'H1 de la página — la keyword exacta, corta: "Desarrollo web en Panamá"',
      },
    },
    slugField(),
    {
      name: 'excerpt',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Entrada bajo el H1: la propuesta de valor en una o dos frases',
      },
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
    },
    {
      name: 'service',
      type: 'relationship',
      relationTo: 'services',
      label: 'Servicio relacionado',
      admin: {
        description:
          'Alimenta el bloque "El servicio, en detalle", el CTA de cotización y las FAQs si la landing no define las suyas',
      },
    },
    {
      name: 'faqs',
      type: 'relationship',
      relationTo: 'faqs',
      hasMany: true,
      label: 'Preguntas frecuentes',
      admin: {
        description: 'Si se deja vacío se usan las del servicio relacionado',
      },
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
