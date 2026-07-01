import type { CollectionConfig } from 'payload'

import { authenticated, publishedOnly } from '../access'
import { slugField } from '../fields/slug'

export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: {
    singular: 'Post',
    plural: 'Posts',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'categories', 'publishedAt', '_status'],
    group: 'Contenido',
  },
  versions: {
    drafts: true,
  },
  defaultSort: '-publishedAt',
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
        description: 'Resumen corto para tarjetas, listados y meta description',
      },
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      // Relación a team-members (colección pública) y no a users:
      // users tiene lectura restringida y poblarlo filtraría emails
      name: 'author',
      type: 'relationship',
      relationTo: 'team-members',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
    },
    {
      name: 'publishedAt',
      type: 'date',
      defaultValue: () => new Date().toISOString(),
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
