import type { CollectionConfig } from 'payload'

import { anyone, authenticated } from '../access'
import { socialLinksField } from '../fields/socialLinks'

export const TeamMembers: CollectionConfig = {
  slug: 'team-members',
  labels: {
    singular: 'Miembro del equipo',
    plural: 'Equipo',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'role', 'order'],
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
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      type: 'text',
      required: true,
      admin: {
        description: 'Cargo, ej. "Directora de tecnología"',
      },
    },
    {
      name: 'bio',
      type: 'textarea',
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
    },
    socialLinksField(),
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
