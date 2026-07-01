import type { CollectionConfig } from 'payload'

import { anyone, authenticated } from '../access'
import { slugField } from '../fields/slug'

export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: {
    singular: 'Categoría',
    plural: 'Categorías',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug'],
    group: 'Contenido',
  },
  access: {
    read: anyone,
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
      name: 'description',
      type: 'textarea',
    },
  ],
}
