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
      name: 'stats',
      type: 'array',
      label: 'Cifras destacadas',
      maxRows: 4,
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
