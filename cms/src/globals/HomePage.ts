import type { GlobalConfig } from 'payload'

import { anyone, authenticated } from '../access'
import { ctaFields } from '../fields/link'

export const HomePage: GlobalConfig = {
  slug: 'home-page',
  label: 'Página de inicio',
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
      name: 'hero',
      type: 'group',
      fields: [
        {
          name: 'eyebrow',
          type: 'text',
          admin: {
            description: 'Texto pequeño sobre el título, ej. "Agencia digital"',
          },
        },
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'subtitle',
          type: 'textarea',
        },
        {
          name: 'primaryCta',
          type: 'group',
          label: 'CTA principal',
          fields: ctaFields,
        },
        {
          name: 'secondaryCta',
          type: 'group',
          label: 'CTA secundario',
          fields: ctaFields,
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
        },
      ],
    },
    {
      name: 'valueProposition',
      type: 'group',
      label: 'Propuesta de valor',
      fields: [
        {
          name: 'title',
          type: 'text',
        },
        {
          name: 'text',
          type: 'textarea',
        },
      ],
    },
    {
      name: 'stats',
      type: 'array',
      label: 'Cifras destacadas',
      maxRows: 4,
      admin: {
        description: 'Se muestran dentro del bloque de confianza',
      },
      fields: [
        {
          name: 'value',
          type: 'text',
          required: true,
          admin: {
            description: 'Ej. "+120"',
          },
        },
        {
          name: 'label',
          type: 'text',
          required: true,
          admin: {
            description: 'Ej. "proyectos entregados"',
          },
        },
      ],
    },
    {
      name: 'servicesSection',
      type: 'group',
      label: 'Sección de servicios',
      fields: [
        {
          name: 'title',
          type: 'text',
        },
        {
          name: 'subtitle',
          type: 'textarea',
        },
        {
          name: 'featuredServices',
          type: 'relationship',
          relationTo: 'services',
          hasMany: true,
          admin: {
            description: 'Servicios destacados en el home, en este orden',
          },
        },
      ],
    },
    {
      name: 'benefits',
      type: 'group',
      label: 'Beneficios',
      fields: [
        {
          name: 'title',
          type: 'text',
        },
        {
          name: 'items',
          type: 'array',
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
      ],
    },
    {
      name: 'process',
      type: 'group',
      label: 'Proceso de trabajo',
      fields: [
        {
          name: 'title',
          type: 'text',
        },
        {
          name: 'subtitle',
          type: 'textarea',
        },
        {
          name: 'steps',
          type: 'array',
          maxRows: 6,
          admin: {
            description: 'Secuencia real de trabajo — el frontend los numera en orden',
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
        },
      ],
    },
    {
      name: 'clientsSection',
      type: 'group',
      label: 'Logos de clientes',
      admin: {
        description: 'Los logos salen de la colección Clientes, ordenada por su campo order',
      },
      fields: [
        {
          name: 'title',
          type: 'text',
        },
      ],
    },
    {
      name: 'projectsSection',
      type: 'group',
      label: 'Sección de proyectos',
      fields: [
        {
          name: 'title',
          type: 'text',
        },
        {
          name: 'subtitle',
          type: 'textarea',
        },
        {
          name: 'featuredProjects',
          type: 'relationship',
          relationTo: 'projects',
          hasMany: true,
          admin: {
            description: 'Proyectos destacados en el home, en este orden',
          },
        },
      ],
    },
    {
      name: 'testimonialsSection',
      type: 'group',
      label: 'Sección de testimonios',
      fields: [
        {
          name: 'title',
          type: 'text',
        },
        {
          name: 'featuredTestimonials',
          type: 'relationship',
          relationTo: 'testimonials',
          hasMany: true,
          admin: {
            description: 'Testimonios destacados en el home, en este orden',
          },
        },
      ],
    },
    {
      name: 'trustBlock',
      type: 'group',
      label: 'Bloque de confianza',
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
          name: 'items',
          type: 'array',
          maxRows: 6,
          label: 'Garantías',
          fields: [
            {
              name: 'text',
              type: 'text',
              required: true,
            },
          ],
        },
      ],
    },
    {
      name: 'ctaSection',
      type: 'group',
      label: 'Sección CTA final',
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
