import type { CollectionConfig } from 'payload'

import { anyone, authenticated } from '../access'

export const FAQs: CollectionConfig = {
  slug: 'faqs',
  labels: {
    singular: 'Pregunta frecuente',
    plural: 'FAQs',
  },
  admin: {
    useAsTitle: 'question',
    defaultColumns: ['question', 'order'],
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
      name: 'question',
      type: 'text',
      required: true,
    },
    {
      name: 'answer',
      type: 'richText',
      required: true,
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
