import type { Endpoint, Payload } from 'payload'
import { headersWithCors } from 'payload'
import { z } from 'zod'

import type { Lead } from '../payload-types'
import { leadConfirmationEmail, leadNotificationEmail } from './emails'
import { isRateLimited } from './rateLimit'
import { leadSubmitSchema } from './schema'

/**
 * POST /api/leads/submit — la única puerta pública de entrada de leads
 * (FASE 7): valida con Zod, descarta bots por honeypot, limita por IP,
 * guarda vía Local API y dispara los emails fuera del camino crítico.
 */
export const leadSubmitEndpoint: Endpoint = {
  path: '/submit',
  method: 'post',
  handler: async (req) => {
    const respond = (body: Record<string, unknown>, status: number) =>
      Response.json(body, {
        status,
        headers: headersWithCors({ headers: new Headers(), req }),
      })

    // Rate limit antes de tocar nada: cuenta también los intentos inválidos
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
    if (isRateLimited(ip)) {
      return respond(
        {
          ok: false,
          message: 'Demasiados envíos seguidos. Espera unos minutos e inténtalo de nuevo.',
        },
        429,
      )
    }

    let raw: unknown
    try {
      raw = await req.json?.()
    } catch {
      return respond({ ok: false, message: 'El cuerpo de la petición no es JSON válido.' }, 400)
    }

    const parsed = leadSubmitSchema.safeParse(raw)
    if (!parsed.success) {
      return respond({ ok: false, errors: z.flattenError(parsed.error).fieldErrors }, 400)
    }

    const { website, ...data } = parsed.data

    // Honeypot con valor: responder como éxito sin guardar (no avisar al bot)
    if (website) return respond({ ok: true }, 200)

    let lead: Lead
    try {
      lead = await req.payload.create({
        collection: 'leads',
        data: { ...data, status: 'new' },
        depth: 1, // resuelve el servicio para el email de notificación
      })
    } catch (error) {
      req.payload.logger.error({ err: error }, 'leads/submit: no se pudo crear el lead')
      return respond(
        {
          ok: false,
          message: 'No pudimos guardar tu solicitud. Inténtalo de nuevo en un momento.',
        },
        500,
      )
    }

    // Los emails no bloquean la respuesta ni revierten el lead si fallan
    void sendLeadEmails(req.payload, lead)

    return respond({ ok: true, id: lead.id }, 201)
  },
}

async function sendLeadEmails(payload: Payload, lead: Lead): Promise<void> {
  let contactEmail: string | null | undefined
  try {
    const settings = await payload.findGlobal({ slug: 'site-settings' })
    contactEmail = settings.contactEmail
  } catch (error) {
    payload.logger.error({ err: error }, 'leads/submit: no se pudo leer site-settings')
  }

  const serverURL = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'
  const notifyTo = process.env.LEADS_NOTIFY_EMAIL || contactEmail

  if (notifyTo) {
    try {
      const { subject, html } = leadNotificationEmail(
        lead,
        `${serverURL}/admin/collections/leads/${lead.id}`,
      )
      await payload.sendEmail({ to: notifyTo, subject, html })
    } catch (error) {
      payload.logger.error({ err: error }, 'leads/submit: falló la notificación interna')
    }
  } else {
    payload.logger.warn(
      'leads/submit: sin destinatario de notificaciones (LEADS_NOTIFY_EMAIL o contactEmail en Ajustes del sitio)',
    )
  }

  try {
    const { subject, html } = leadConfirmationEmail(lead, contactEmail)
    await payload.sendEmail({ to: lead.email, subject, html })
  } catch (error) {
    payload.logger.error({ err: error }, 'leads/submit: falló la confirmación al usuario')
  }
}
