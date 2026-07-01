import type { CollectionConfig } from 'payload'

import { anyone, authenticated, isAdmin } from '../access'

export const Leads: CollectionConfig = {
  slug: 'leads',
  labels: {
    singular: 'Lead',
    plural: 'Leads',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'service', 'status', 'createdAt'],
    group: 'CRM',
  },
  defaultSort: '-createdAt',
  access: {
    // El formulario público de la web postea sin auth (FASE 7);
    // leer y gestionar leads requiere login, borrarlos solo admin
    create: anyone,
    read: authenticated,
    update: authenticated,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      type: 'email',
      required: true,
      index: true,
    },
    {
      name: 'phone',
      type: 'text',
    },
    {
      name: 'company',
      type: 'text',
    },
    {
      name: 'service',
      type: 'relationship',
      relationTo: 'services',
      admin: {
        description: 'Servicio por el que pregunta',
      },
    },
    {
      name: 'message',
      type: 'textarea',
    },
    {
      name: 'source',
      type: 'text',
      admin: {
        description: 'Página o campaña de origen, ej. "/servicios/seo" o "google-ads"',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      options: [
        { label: 'Nuevo', value: 'new' },
        { label: 'Contactado', value: 'contacted' },
        { label: 'Ganado', value: 'won' },
        { label: 'Perdido', value: 'lost' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: {
        position: 'sidebar',
        description: 'Notas internas de seguimiento (no públicas)',
      },
    },
  ],
}
