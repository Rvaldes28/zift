import type { GlobalConfig } from 'payload'

import { anyone, authenticated } from '../access'
import { ctaFields } from '../fields/link'

export const AboutPage: GlobalConfig = {
  slug: 'about-page',
  label: 'Quiénes somos',
  admin: {
    group: 'Contenido',
  },
  versions: {
    drafts: true,
  },
  access: {
    read: anyone,
    update: authenticated,
  },
  fields: [
    {
      name: 'intro',
      type: 'group',
      fields: [
        {
          name: 'eyebrow',
          type: 'text',
        },
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'text',
          type: 'textarea',
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
        },
      ],
    },
    {
      name: 'story',
      type: 'richText',
      label: 'Nuestra historia',
    },
    {
      name: 'values',
      type: 'array',
      label: 'Valores',
      maxRows: 6,
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
      name: 'teamSection',
      type: 'group',
      label: 'Sección de equipo',
      admin: {
        description: 'Los miembros salen de la colección Equipo, ordenada por su campo order',
      },
      fields: [
        {
          name: 'title',
          type: 'text',
        },
        {
          name: 'subtitle',
          type: 'textarea',
        },
      ],
    },
    {
      name: 'ctaSection',
      type: 'group',
      label: 'CTA final',
      fields: [
        {
          name: 'title',
          type: 'text',
        },
        {
          name: 'text',
          type: 'textarea',
        },
        {
          name: 'cta',
          type: 'group',
          label: 'Botón',
          fields: ctaFields,
        },
      ],
    },
  ],
}
