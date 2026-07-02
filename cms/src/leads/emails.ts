import type { Lead, Service } from '../payload-types'

import { BUDGET_LABELS, FORM_TYPE_LABELS } from './schema'

/**
 * Plantillas de email del flujo de leads (FASE 7): notificación interna y
 * confirmación al usuario. HTML con estilos inline (requisito de clientes
 * de correo) y tipografías de sistema — sin webfonts en email.
 */

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const INK = '#14161c'
const MUTED = '#596070'
const LINE = '#e3e5eb'
const ZIFT = '#4633ff'

const layout = (content: string) => `
  <div style="margin:0;padding:32px 16px;background:#fcfcfd;color:${INK};font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid ${LINE};border-top:3px solid ${ZIFT};border-radius:8px;padding:32px;">
      ${content}
      <p style="margin:32px 0 0;padding-top:16px;border-top:1px solid ${LINE};font-size:12px;color:${MUTED};">
        ZiftLab — Tecnología que vende
      </p>
    </div>
  </div>`

const row = (label: string, value: string) => `
  <tr>
    <td style="padding:8px 16px 8px 0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${MUTED};vertical-align:top;white-space:nowrap;">${label}</td>
    <td style="padding:8px 0;font-size:14px;color:${INK};">${escapeHtml(value)}</td>
  </tr>`

const serviceTitle = (service: Lead['service']): string | null => {
  if (!service) return null
  if (typeof service === 'number') return `#${service}`
  return (service as Service).title
}

/** Aviso interno de lead nuevo, con enlace directo al panel. */
export function leadNotificationEmail(lead: Lead, adminUrl: string) {
  const formLabel = FORM_TYPE_LABELS[lead.formType]
  const rows = [
    row('Formulario', formLabel),
    row('Nombre', lead.name),
    row('Email', lead.email),
    lead.phone ? row('Teléfono', lead.phone) : '',
    lead.company ? row('Empresa', lead.company) : '',
    serviceTitle(lead.service) ? row('Servicio', serviceTitle(lead.service)!) : '',
    lead.budget ? row('Presupuesto', BUDGET_LABELS[lead.budget]) : '',
    lead.message ? row('Mensaje', lead.message) : '',
    lead.source ? row('Fuente', lead.source) : '',
  ].join('')

  return {
    subject: `Lead nuevo (${formLabel}): ${lead.name}`,
    html: layout(`
      <p style="margin:0;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:${MUTED};">■&nbsp; Lead nuevo</p>
      <h1 style="margin:12px 0 20px;font-size:20px;">${escapeHtml(lead.name)} — ${formLabel}</h1>
      <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;">${rows}</table>
      <p style="margin:24px 0 0;">
        <a href="${adminUrl}" style="display:inline-block;background:${ZIFT};color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 20px;border-radius:6px;">Ver en el panel</a>
      </p>`),
  }
}

/** Confirmación al usuario: qué recibimos y qué pasa ahora. */
export function leadConfirmationEmail(lead: Lead, contactEmail?: string | null) {
  const nextStep: Record<Lead['formType'], string> = {
    contacto: 'Leemos tu mensaje y te respondemos en menos de 24 horas hábiles.',
    asesoria:
      'Te escribimos en menos de 24 horas hábiles para confirmar tu asesoría gratuita de 30 minutos.',
    cotizacion:
      'Preparamos tu propuesta con alcance, plazo y precio cerrado. La recibes en un máximo de 48 horas hábiles.',
  }

  return {
    subject: 'Recibimos tu solicitud — ZiftLab',
    html: layout(`
      <p style="margin:0;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:${MUTED};">■&nbsp; Solicitud recibida</p>
      <h1 style="margin:12px 0 16px;font-size:20px;">Gracias, ${escapeHtml(lead.name)} — te leemos ya</h1>
      <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:${INK};">${nextStep[lead.formType]}</p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:${MUTED};">
        Si quieres añadir algo mientras tanto, responde a este correo${
          contactEmail
            ? ` o escríbenos a <a href="mailto:${contactEmail}" style="color:${ZIFT};">${contactEmail}</a>`
            : ''
        }.
      </p>`),
  }
}
