import type { FieldHook, TextField } from 'payload'

// "Automatización & CRM" → "automatizacion-crm" (minúsculas, sin acentos, guiones)
export const formatSlug = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '')

const formatSlugHook =
  (source: string): FieldHook =>
  ({ data, operation, value }) => {
    if (typeof value === 'string' && value.length > 0) {
      return formatSlug(value)
    }
    if (operation === 'create' || operation === 'update') {
      const fallback = data?.[source]
      if (typeof fallback === 'string' && fallback.length > 0) {
        return formatSlug(fallback)
      }
    }
    return value
  }

// Slug único autogenerado desde el campo fuente (editable a mano si hace falta)
export const slugField = (source = 'title'): TextField => ({
  name: 'slug',
  type: 'text',
  unique: true,
  index: true,
  admin: {
    position: 'sidebar',
    description: `Se genera desde "${source}" si se deja vacío`,
  },
  hooks: {
    beforeValidate: [formatSlugHook(source)],
  },
})
