import { z } from 'zod'

/**
 * Validación client-side del formulario de leads (FASE 7) — espejo del
 * schema canónico del servidor en cms/src/leads/schema.ts. Si cambias
 * valores u opciones allí, actualiza también este archivo.
 */

export type LeadFormType = 'contacto' | 'asesoria' | 'cotizacion'

export const BUDGET_OPTIONS = [
  { value: 'lt-1500', label: 'Menos de $1,500' },
  { value: '1500-5000', label: '$1,500 – $5,000' },
  { value: '5000-15000', label: '$5,000 – $15,000' },
  { value: 'gt-15000', label: 'Más de $15,000' },
  { value: 'unknown', label: 'Aún no lo sé' },
] as const

export interface LeadFormValues {
  name: string
  email: string
  phone: string
  company: string
  service: string
  budget: string
  message: string
}

export type LeadFieldErrors = Partial<Record<keyof LeadFormValues, string>>

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Escribe tu nombre para saber a quién respondemos.')
    .max(200, 'El nombre es demasiado largo.'),
  email: z
    .string()
    .trim()
    .max(254, 'El email es demasiado largo.')
    .pipe(z.email('Revisa el email: no parece una dirección válida.')),
  phone: z.string().trim().max(40, 'El teléfono es demasiado largo.'),
  company: z.string().trim().max(200, 'El nombre de la empresa es demasiado largo.'),
  message: z.string().trim().max(5000, 'El mensaje supera los 5,000 caracteres.'),
})

export interface LeadValidationOptions {
  requireMessage?: boolean
  requireBudget?: boolean
}

/** Devuelve un mensaje por campo inválido; objeto vacío = todo bien. */
export function validateLead(
  values: LeadFormValues,
  options: LeadValidationOptions = {},
): LeadFieldErrors {
  const errors: LeadFieldErrors = {}

  const parsed = schema.safeParse(values)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof LeadFormValues
      errors[field] ??= issue.message
    }
  }

  if (options.requireMessage && !values.message.trim()) {
    errors.message ??= 'Cuéntanos tu proyecto: es lo que cotizamos.'
  }
  if (options.requireBudget && !values.budget) {
    errors.budget ??= 'Elige un rango — «Aún no lo sé» también cuenta.'
  }

  return errors
}
