import type { CollectionConfig } from 'payload'

import { authenticated, isAdmin } from '../access'
import { BUDGET_LABELS, FORM_TYPE_LABELS } from '../leads/schema'
import { leadSubmitEndpoint } from '../leads/submit'

export const Leads: CollectionConfig = {
  slug: 'leads',
  labels: {
    singular: 'Lead',
    plural: 'Leads',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'formType', 'service', 'status', 'createdAt'],
    group: 'CRM',
  },
  defaultSort: '-createdAt',
  access: {
    // El público entra por POST /api/leads/submit (Zod + honeypot + rate
    // limit, FASE 7); crear directo por la REST API requiere login.
    create: authenticated,
    read: authenticated,
    update: authenticated,
    delete: isAdmin,
  },
  endpoints: [leadSubmitEndpoint],
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
      name: 'budget',
      type: 'select',
      options: Object.entries(BUDGET_LABELS).map(([value, label]) => ({ label, value })),
      admin: {
        description: 'Presupuesto estimado en USD',
      },
    },
    {
      name: 'message',
      type: 'textarea',
    },
    {
      name: 'formType',
      type: 'select',
      required: true,
      defaultValue: 'contacto',
      options: Object.entries(FORM_TYPE_LABELS).map(([value, label]) => ({ label, value })),
      admin: {
        position: 'sidebar',
        description: 'Formulario desde el que llegó el lead',
      },
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
