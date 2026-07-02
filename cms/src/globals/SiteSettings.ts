import type { GlobalConfig } from 'payload'

import { anyone, authenticated } from '../access'
import { socialLinksField } from '../fields/socialLinks'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Ajustes del sitio',
  admin: {
    group: 'Configuración',
  },
  access: {
    read: anyone,
    update: authenticated,
  },
  fields: [
    {
      name: 'siteName',
      type: 'text',
      required: true,
      defaultValue: 'ZiftLab',
    },
    {
      name: 'tagline',
      type: 'text',
      admin: {
        description: 'Frase corta que acompaña al nombre, ej. "Tecnología que vende"',
      },
    },
    {
      name: 'contactEmail',
      type: 'email',
    },
    {
      name: 'phone',
      type: 'text',
    },
    {
      name: 'whatsapp',
      type: 'text',
      admin: {
        description: 'Número en formato internacional, ej. +5215512345678',
      },
    },
    {
      name: 'address',
      type: 'text',
    },
    {
      name: 'calendlyUrl',
      type: 'text',
      admin: {
        description:
          'URL del evento de Calendly para la asesoría gratuita, ej. https://calendly.com/ziftlab/asesoria — vacío: /asesoria muestra solo el formulario',
      },
    },
    socialLinksField(),
    {
      // Fallback de SEO para páginas sin meta propia
      name: 'defaultSeo',
      type: 'group',
      label: 'SEO por defecto',
      fields: [
        {
          name: 'title',
          type: 'text',
        },
        {
          name: 'description',
          type: 'textarea',
        },
        {
          name: 'ogImage',
          type: 'upload',
          relationTo: 'media',
          admin: {
            description: 'Imagen para compartir en redes (1200×630 recomendado)',
          },
        },
      ],
    },
  ],
}
