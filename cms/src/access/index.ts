import type { Access, FieldAccess } from 'payload'

export const anyone: Access = () => true

export const authenticated: Access = ({ req: { user } }) => Boolean(user)

export const isAdmin: Access = ({ req: { user } }) => Boolean(user?.roles?.includes('admin'))

export const isAdminFieldLevel: FieldAccess = ({ req: { user } }) =>
  Boolean(user?.roles?.includes('admin'))

export const isAdminOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false
  if (user.roles?.includes('admin')) return true
  return { id: { equals: user.id } }
}

// Colecciones con drafts: los anónimos solo ven documentos publicados
export const publishedOnly: Access = ({ req: { user } }) => {
  if (user) return true
  return { _status: { equals: 'published' } }
}
