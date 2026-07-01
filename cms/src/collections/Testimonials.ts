import type { CollectionConfig } from 'payload'

import { anyone, authenticated } from '../access'

export const Testimonials: CollectionConfig = {
  slug: 'testimonials',
  labels: {
    singular: 'Testimonio',
    plural: 'Testimonios',
  },
  admin: {
    useAsTitle: 'authorName',
    defaultColumns: ['authorName', 'client', 'order'],
    group: 'Empresa',
  },
  defaultSort: 'order',
  access: {
    read: anyone,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    {
      name: 'quote',
      type: 'textarea',
      required: true,
    },
    {
      name: 'authorName',
      type: 'text',
      required: true,
    },
    {
      name: 'authorRole',
      type: 'text',
      admin: {
        description: 'Cargo y empresa, ej. "CEO, Acme"',
      },
    },
    {
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
      admin: {
        description: 'Cliente relacionado (opcional)',
      },
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
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
