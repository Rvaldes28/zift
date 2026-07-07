import { CSRF_FIELD, createCsrfToken } from '@/lib/security/csrf'

export async function CsrfField() {
  const token = await createCsrfToken()
  return <input type="hidden" name={CSRF_FIELD} value={token} />
}
