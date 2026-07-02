import type { GlobalConfig } from 'payload'

import { anyone, authenticated } from '../access'

export const ContactPage: GlobalConfig = {
  slug: 'contact-page',
  label: 'Contacto',
  admin: {
    group: 'Contenido',
    description: 'Los datos de contacto (email, teléfono, dirección) viven en Ajustes del sitio',
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
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'text',
      type: 'textarea',
    },
  ],
}
