import 'server-only'

import { leadFormLabel, leadStatusLabel } from './constants'
import type { ListedLead } from './queries'

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const text = value instanceof Date ? value.toISOString() : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

export function leadsToCsv(leads: ListedLead[]): string {
  const headers = [
    'Fecha',
    'Estado',
    'Formulario',
    'Nombre',
    'Email',
    'Telefono',
    'Empresa',
    'Servicio',
    'Presupuesto',
    'Mensaje',
    'Responsable',
    'Source',
    'UTM',
  ]

  const rows = leads.map((lead) => [
    lead.createdAt,
    leadStatusLabel(lead.status),
    leadFormLabel(lead.formType),
    lead.name,
    lead.email,
    lead.phone,
    lead.company,
    lead.serviceTitle,
    lead.budget,
    lead.message,
    lead.assignedUserName ?? lead.assignedUserEmail,
    lead.source,
    Object.keys(lead.utm).length > 0 ? JSON.stringify(lead.utm) : '',
  ])

  return `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')}\n`
}
