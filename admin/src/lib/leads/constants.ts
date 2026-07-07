export const LEAD_STATUSES = ['new', 'contacted', 'follow_up', 'converted', 'lost', 'spam'] as const

export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  contacted: 'Contactado',
  converted: 'Convertido',
  follow_up: 'En seguimiento',
  lost: 'Perdido',
  new: 'Nuevo',
  spam: 'Spam',
}

export const LEAD_FORM_LABELS: Record<string, string> = {
  asesoria: 'Asesoria',
  contacto: 'Contacto',
  cotizacion: 'Cotizacion',
}

export function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === 'string' && LEAD_STATUSES.includes(value as LeadStatus)
}

export function leadStatusLabel(status: string | null | undefined): string {
  return isLeadStatus(status) ? LEAD_STATUS_LABELS[status] : 'Sin estado'
}

export function leadFormLabel(formType: string | null | undefined): string {
  return formType ? (LEAD_FORM_LABELS[formType] ?? formType) : 'Sin formulario'
}
