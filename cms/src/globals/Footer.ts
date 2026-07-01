import type { GlobalConfig } from 'payload'

import { anyone, authenticated } from '../access'
import { linkFields } from '../fields/link'

export const Footer: GlobalConfig = {
  slug: 'footer',
  label: 'Footer',
  admin: {
    group: 'Configuración',
  },
  access: {
    read: anyone,
    update: authenticated,
  },
  fields: [
    {
      name: 'columns',
      type: 'array',
      label: 'Columnas de links',
      maxRows: 4,
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'links',
          type: 'array',
          fields: linkFields,
        },
      ],
    },
    {
      name: 'bottomText',
      type: 'text',
      admin: {
        description: 'Línea legal/copyright, ej. "© 2026 ZiftLab. Todos los derechos reservados."',
      },
    },
  ],
}
