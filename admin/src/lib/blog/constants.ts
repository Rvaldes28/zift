import { z } from 'zod'

export const BLOG_STATUSES = ['draft', 'published', 'scheduled', 'archived'] as const
export type BlogStatus = (typeof BLOG_STATUSES)[number]

export const BLOG_STATUS_LABELS: Record<BlogStatus, string> = {
  archived: 'Archivado',
  draft: 'Borrador',
  published: 'Publicado',
  scheduled: 'Programado',
}

export const blogStatusSchema = z.enum(BLOG_STATUSES)

export function blogStatusLabel(status: string): string {
  return BLOG_STATUS_LABELS[status as BlogStatus] ?? status
}
