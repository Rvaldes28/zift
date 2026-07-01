import type { Field } from 'payload'

// Subcampos de un link de navegación/CTA. Los href son texto plano
// (ruta interna "/servicios" o URL externa) — es lo que Astro consume directo.
export const linkFields: Field[] = [
  {
    name: 'label',
    type: 'text',
    required: true,
  },
  {
    name: 'href',
    type: 'text',
    required: true,
    admin: {
      description: 'Ruta interna (/servicios) o URL externa (https://…)',
    },
  },
  {
    name: 'newTab',
    type: 'checkbox',
    defaultValue: false,
    label: 'Abrir en pestaña nueva',
  },
]

// Variante para CTAs opcionales dentro de un group: nada es required,
// el frontend solo pinta el botón si label y href están completos.
export const ctaFields: Field[] = [
  {
    name: 'label',
    type: 'text',
  },
  {
    name: 'href',
    type: 'text',
    admin: {
      description: 'Ruta interna (/contacto) o URL externa (https://…)',
    },
  },
  {
    name: 'newTab',
    type: 'checkbox',
    defaultValue: false,
    label: 'Abrir en pestaña nueva',
  },
]
