import type { ArrayField } from 'payload'

// Redes sociales reutilizadas por SiteSettings (empresa) y TeamMembers (personas)
export const socialLinksField = (name = 'socialLinks'): ArrayField => ({
  name,
  type: 'array',
  label: 'Redes sociales',
  fields: [
    {
      name: 'platform',
      type: 'select',
      required: true,
      options: [
        { label: 'LinkedIn', value: 'linkedin' },
        { label: 'Instagram', value: 'instagram' },
        { label: 'Facebook', value: 'facebook' },
        { label: 'X (Twitter)', value: 'x' },
        { label: 'TikTok', value: 'tiktok' },
        { label: 'YouTube', value: 'youtube' },
        { label: 'GitHub', value: 'github' },
        { label: 'Otra', value: 'other' },
      ],
    },
    {
      name: 'url',
      type: 'text',
      required: true,
    },
  ],
})
