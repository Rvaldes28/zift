import type { GlobalConfig } from 'payload'

import { anyone, authenticated } from '../access'
import { ctaFields, linkFields } from '../fields/link'

export const Header: GlobalConfig = {
  slug: 'header',
  label: 'Header',
  admin: {
    group: 'Configuración',
  },
  access: {
    read: anyone,
    update: authenticated,
  },
  fields: [
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'navItems',
      type: 'array',
      label: 'Navegación',
      maxRows: 8,
      fields: linkFields,
    },
    {
      name: 'cta',
      type: 'group',
      label: 'Botón CTA',
      fields: ctaFields,
    },
  ],
}
