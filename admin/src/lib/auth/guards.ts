import 'server-only'

import { redirect } from 'next/navigation'

import { getCurrentSession } from './session'

export async function requireCurrentSession() {
  const current = await getCurrentSession()
  if (!current) redirect('/login')

  return current
}
