import { z } from 'zod'

/**
 * Validación server-side del formulario público de leads (FASE 7).
 * El frontend valida con su propio espejo en web/src/lib/leads.ts —
 * si cambias valores u opciones aquí, actualiza también ese archivo.
 */

export const FORM_TYPE_LABELS = {
  contacto: 'Contacto',
  asesoria: 'Asesoría gratuita',
  cotizacion: 'Cotización',
} as const

export const BUDGET_LABELS = {
  'lt-1500': 'Menos de $1,500',
  '1500-5000': '$1,500 – $5,000',
  '5000-15000': '$5,000 – $15,000',
  'gt-15000': 'Más de $15,000',
  unknown: 'Aún no lo sé',
} as const

export type LeadFormType = keyof typeof FORM_TYPE_LABELS
export type LeadBudget = keyof typeof BUDGET_LABELS

const FORM_TYPES = Object.keys(FORM_TYPE_LABELS) as [LeadFormType, ...LeadFormType[]]
const BUDGETS = Object.keys(BUDGET_LABELS) as [LeadBudget, ...LeadBudget[]]

/** Sanitiza texto libre: sin caracteres de control ni espacios sobrantes. */
const sanitize = (value: string) => value.replace(/[\u0000-\u001F\u007F]/g, ' ').trim()

const text = (max: number, min = 0) =>
  z.string().transform(sanitize).pipe(z.string().min(min).max(max))

/** Campos opcionales llegan como '' desde el form — se normalizan a undefined. */
const emptyToUndefined = (value: unknown) => (value === '' || value === null ? undefined : value)

export const leadSubmitSchema = z
  .object({
    formType: z.enum(FORM_TYPES),
    name: text(200, 2),
    email: z.string().transform(sanitize).pipe(z.string().max(254)).pipe(z.email()),
    phone: z.preprocess(emptyToUndefined, text(40).optional()),
    company: z.preprocess(emptyToUndefined, text(200).optional()),
    service: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional()),
    budget: z.preprocess(emptyToUndefined, z.enum(BUDGETS).optional()),
    message: z.preprocess(emptyToUndefined, text(5000).optional()),
    source: z.preprocess(emptyToUndefined, text(200).optional()),
    // Atribución UTM (FASE 12): la captura el cliente (web/src/lib/utm.ts)
    utm: z
      .object({
        source: z.preprocess(emptyToUndefined, text(200).optional()),
        medium: z.preprocess(emptyToUndefined, text(200).optional()),
        campaign: z.preprocess(emptyToUndefined, text(200).optional()),
        term: z.preprocess(emptyToUndefined, text(200).optional()),
        content: z.preprocess(emptyToUndefined, text(200).optional()),
      })
      .optional(),
    // Honeypot: los humanos no ven este campo; si llega con valor es un bot
    website: z.preprocess(emptyToUndefined, z.string().optional()),
  })
  .superRefine((data, ctx) => {
    if (data.formType === 'cotizacion' && !data.message) {
      ctx.addIssue({
        code: 'custom',
        path: ['message'],
        message: 'Para cotizar necesitamos que describas tu proyecto.',
      })
    }
  })

export type LeadSubmitData = z.infer<typeof leadSubmitSchema>
